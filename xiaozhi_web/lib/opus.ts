// lib/opus.ts
// Opus 编解码器，参考 tour_backend/test/js/opus.js 实现

export type OpusEncoderHandle = {
  encode: (pcm: Int16Array) => Uint8Array | null;
  destroy: ()=>void;
};

export type OpusDecoderHandle = {
  decode: (opus: Uint8Array) => Int16Array;
  destroy?: () => void;
};

type CheckHooks = { onOk: ()=>void; onFail: (msg:string)=>void };

// 检查Opus库是否已加载（参考 test/js/opus.js 实现）
export function checkOpusLoaded(hooks: CheckHooks) {
  const anyWin = window as any;
  
  const tryInit = () => {
    try {
      // 检查Module是否存在（libopus.js导出的全局变量）
      if (typeof anyWin.Module === 'undefined') {
        return false;
      }

      const Module = anyWin.Module;

      // 尝试先使用Module.instance（libopus.js最后一行导出方式）
      if (typeof Module.instance !== 'undefined' && typeof Module.instance._opus_decoder_get_size === 'function') {
        // 使用Module.instance对象替换全局Module对象
        anyWin.ModuleInstance = Module.instance;
        return true;
      }

      // 如果没有Module.instance，检查全局Module函数
      if (typeof Module._opus_decoder_get_size === 'function') {
        anyWin.ModuleInstance = Module;
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  };

  // 立即尝试初始化
  if (tryInit()) {
    hooks.onOk();
    return;
  }

  // 如果失败，等待并重试（最多重试5次，每次间隔200ms）
  let retryCount = 0;
  const maxRetries = 5;
  const retryInterval = 200;

  const retry = () => {
    retryCount++;
    if (tryInit()) {
      hooks.onOk();
      return;
    }

    if (retryCount < maxRetries) {
      setTimeout(retry, retryInterval);
    } else {
      hooks.onFail('Opus解码函数未找到，Module可能未正确加载');
    }
  };

  setTimeout(retry, retryInterval);
}

// 创建Opus编码器（单例模式，类似test实现）
let globalOpusEncoder: any = null;

export function initOpusEncoder(opts: { sampleRate:number; channels:number; frameSize:number; onLog?:(m:string,l?:string)=>void }): OpusEncoderHandle | null {
  try {
    // 如果已经初始化过，直接返回
    if (globalOpusEncoder) {
      return globalOpusEncoder;
    }

    const anyWin = window as any;
    if (!anyWin.ModuleInstance) {
      opts.onLog?.('无法创建Opus编码器：ModuleInstance不可用', 'error');
      return null;
    }

    const mod = anyWin.ModuleInstance;
    const { sampleRate, channels, frameSize } = opts;
    const application = 2048; // OPUS_APPLICATION_VOIP
    const maxPacketSize = 4000;

    // 创建编码器对象
    const encoder = {
      channels,
      sampleRate,
      frameSize,
      maxPacketSize,
      module: mod,
      encoderPtr: null as any,

      // 初始化编码器
      init() {
        try {
          // 获取编码器大小
          const encoderSize = this.module._opus_encoder_get_size(this.channels);
          opts.onLog?.(`Opus编码器大小: ${encoderSize}字节`, 'info');

          // 分配内存
          this.encoderPtr = this.module._malloc(encoderSize);
          if (!this.encoderPtr) {
            throw new Error("无法分配编码器内存");
          }

          // 初始化编码器
          const err = this.module._opus_encoder_init(
            this.encoderPtr,
            this.sampleRate,
            this.channels,
            application
          );

          if (err < 0) {
            throw new Error(`Opus编码器初始化失败: ${err}`);
          }

          // 设置位率 (16kbps)
          this.module._opus_encoder_ctl(this.encoderPtr, 4002, 16000);
          // 设置复杂度 (0-10)
          this.module._opus_encoder_ctl(this.encoderPtr, 4010, 5);
          // 设置使用DTX (不传输静音帧)
          this.module._opus_encoder_ctl(this.encoderPtr, 4016, 1);

          opts.onLog?.("Opus编码器初始化成功", 'success');
          return true;
        } catch (error: any) {
          if (this.encoderPtr) {
            this.module._free(this.encoderPtr);
            this.encoderPtr = null;
          }
          opts.onLog?.(`Opus编码器初始化失败: ${error.message}`, 'error');
          return false;
        }
      },

      // 编码PCM数据为Opus
      encode(pcmData: Int16Array): Uint8Array | null {
        if (!this.encoderPtr) {
          if (!this.init()) {
            return null;
          }
        }

        try {
          const mod = this.module;

          // 为PCM数据分配内存
          const pcmPtr = mod._malloc(pcmData.length * 2); // 2字节/int16

          // 将PCM数据复制到HEAP
          for (let i = 0; i < pcmData.length; i++) {
            mod.HEAP16[(pcmPtr >> 1) + i] = pcmData[i];
          }

          // 为输出分配内存
          const outPtr = mod._malloc(this.maxPacketSize);

          // 进行编码
          const encodedLen = mod._opus_encode(
            this.encoderPtr,
            pcmPtr,
            this.frameSize,
            outPtr,
            this.maxPacketSize
          );

          if (encodedLen < 0) {
            throw new Error(`Opus编码失败: ${encodedLen}`);
          }

          // 复制编码后的数据
          const opusData = new Uint8Array(encodedLen);
          for (let i = 0; i < encodedLen; i++) {
            opusData[i] = mod.HEAPU8[outPtr + i];
          }

          // 释放内存
          mod._free(pcmPtr);
          mod._free(outPtr);

          return opusData;
        } catch (error: any) {
          opts.onLog?.(`Opus编码出错: ${error.message}`, 'error');
          return null;
        }
      },

      // 销毁编码器
      destroy() {
        if (this.encoderPtr) {
          this.module._free(this.encoderPtr);
          this.encoderPtr = null;
        }
      }
    };

    encoder.init();
    globalOpusEncoder = encoder;
    return encoder;
  } catch (error: any) {
    opts.onLog?.(`创建Opus编码器失败: ${error.message}`, 'error');
    return null;
  }
}

// 创建Opus解码器
export function createOpusDecoder(opts: { sampleRate:number; channels:number; frameSize:number }): OpusDecoderHandle {
  const anyWin = window as any;
  const mod = anyWin.ModuleInstance;
  if (!mod) throw new Error('ModuleInstance 不存在');

  // 获取解码器大小
  const decoderSize = mod._opus_decoder_get_size(opts.channels);
  const decoderPtr = mod._malloc(decoderSize);
  
  if (!decoderPtr) {
    throw new Error('无法分配解码器内存');
  }

  // 初始化解码器
  const err = mod._opus_decoder_init(decoderPtr, opts.sampleRate, opts.channels);
  if (err < 0) { 
    mod._free(decoderPtr); 
    throw new Error(`opus_decoder_init 失败: ${err}`); 
  }

  return {
    decode(opus: Uint8Array): Int16Array {
      // 为Opus数据分配内存
      const inPtr = mod._malloc(opus.length);
      mod.HEAPU8.set(opus, inPtr);
      
      // 为PCM输出分配内存
      const pcmPtr = mod._malloc(opts.frameSize * 2); // 2字节/int16
      
      // 解码
      const decoded = mod._opus_decode(decoderPtr, inPtr, opus.length, pcmPtr, opts.frameSize, 0);
      
      if (decoded < 0) {
        mod._free(inPtr); 
        mod._free(pcmPtr);
        throw new Error(`opus_decode 失败: ${decoded}`);
      }
      
      // 复制解码后的数据
      const out = new Int16Array(decoded);
      for (let i = 0; i < decoded; i++) {
        out[i] = mod.HEAP16[(pcmPtr >> 1) + i];
      }
      
      // 释放内存
      mod._free(inPtr); 
      mod._free(pcmPtr);
      
      return out;
    },
    destroy() {
      if (decoderPtr) {
        mod._free(decoderPtr);
      }
    }
  };
}

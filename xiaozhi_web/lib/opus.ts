// lib/opus.ts
// 这里假设 public/libopus.js 在全局挂了 `Module` 或 `Module.instance`

export type OpusEncoderHandle = {
  encode: (pcm: Int16Array) => Uint8Array;
  destroy: ()=>void;
};

type CheckHooks = { onOk: ()=>void; onFail: (msg:string)=>void };

export function checkOpusLoaded(hooks: CheckHooks) {
  try {
    const anyWin = window as any;
    const Module = anyWin.Module;
    if (!Module) throw new Error('Module 不存在');
    const mod = (Module.instance && Module.instance._opus_decoder_get_size) ? Module.instance : Module;
    if (!mod._opus_decoder_get_size) throw new Error('未找到 opus 函数');
    anyWin.ModuleInstance = mod;
    hooks.onOk();
  } catch (e:any) {
    hooks.onFail(e?.message || String(e));
  }
}

export function initOpusEncoder(opts: { sampleRate:number; channels:number; frameSize:number; onLog?:(m:string,l?:string)=>void }): OpusEncoderHandle | null {
  const anyWin = window as any;
  const mod = anyWin.ModuleInstance;
  if (!mod) { opts.onLog?.('无法创建编码器：ModuleInstance 不可用','error'); return null; }

  const { sampleRate, channels, frameSize } = opts;
  const application = 2048; // OPUS_APPLICATION_VOIP
  let encoderPtr = 0;

  const init = () => {
    const size = mod._opus_encoder_get_size(channels);
    encoderPtr = mod._malloc(size);
    const err = mod._opus_encoder_init(encoderPtr, sampleRate, channels, application);
    if (err < 0) throw new Error(`opus_encoder_init err=${err}`);
    mod._opus_encoder_ctl(encoderPtr, 4002, 16000); // OPUS_SET_BITRATE
    mod._opus_encoder_ctl(encoderPtr, 4010, 5);     // OPUS_SET_COMPLEXITY
    mod._opus_encoder_ctl(encoderPtr, 4016, 1);     // OPUS_SET_DTX
    opts.onLog?.('Opus 编码器初始化成功','success');
  };

  try { init(); } catch (e:any) { opts.onLog?.(`编码器初始化失败: ${e?.message || e}`,'error'); return null; }

  return {
    encode(pcm: Int16Array) {
      const pcmPtr = mod._malloc(pcm.length * 2);
      for (let i=0;i<pcm.length;i++) mod.HEAP16[(pcmPtr>>1)+i] = pcm[i];
      const maxPacket = 4000;
      const outPtr = mod._malloc(maxPacket);
      const n = mod._opus_encode(encoderPtr, pcmPtr, frameSize, outPtr, maxPacket);
      if (n < 0) {
        mod._free(pcmPtr); mod._free(outPtr);
        throw new Error(`opus_encode err=${n}`);
      }
      const out = new Uint8Array(n);
      for (let i=0;i<n;i++) out[i] = mod.HEAPU8[outPtr + i];
      mod._free(pcmPtr); mod._free(outPtr);
      return out;
    },
    destroy() {
      if (encoderPtr) { mod._free(encoderPtr); encoderPtr = 0; }
    }
  };
}

export function createOpusDecoder(opts: { sampleRate:number; channels:number; frameSize:number }) {
  const anyWin = window as any;
  const mod = anyWin.ModuleInstance;
  if (!mod) throw new Error('ModuleInstance 不存在');

  const decoderSize = mod._opus_decoder_get_size(opts.channels);
  const decoderPtr = mod._malloc(decoderSize);
  const err = mod._opus_decoder_init(decoderPtr, opts.sampleRate, opts.channels);
  if (err < 0) { mod._free(decoderPtr); throw new Error(`opus_decoder_init err=${err}`); }

  return {
    decode(opus: Uint8Array): Int16Array {
      const inPtr = mod._malloc(opus.length);
      mod.HEAPU8.set(opus, inPtr);
      const pcmPtr = mod._malloc(opts.frameSize * 2);
      const decoded = mod._opus_decode(decoderPtr, inPtr, opus.length, pcmPtr, opts.frameSize, 0);
      if (decoded < 0) {
        mod._free(inPtr); mod._free(pcmPtr);
        throw new Error(`opus_decode err=${decoded}`);
      }
      const out = new Int16Array(decoded);
      for (let i=0;i<decoded;i++) out[i] = mod.HEAP16[(pcmPtr>>1)+i];
      mod._free(inPtr); mod._free(pcmPtr);
      return out;
    }
  };
}

// lib/xiaoZhiConnect.ts
type Cfg = { deviceId:string; clientId:string; deviceName:string; deviceMac:string; token:string };

export async function connectViaOTA(otaUrl: string, cfg: Cfg): Promise<{ wsUrl:string } | null> {
  try {
    const res = await fetch(otaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Device-Id': cfg.deviceId,
        'Client-Id': cfg.clientId,
      },
      body: JSON.stringify({
        version: 0, uuid: '',
        application: { name: 'xiaozhi-web-test', version: '1.0.0', compile_time: '2025-04-16 10:00:00', idf_version: '4.4.3', elf_sha256: '1234567890abcdef1234567890abcdef1234567890abcdef' },
        ota: { label: 'xiaozhi-web-test' },
        board: { type: 'xiaozhi-web-test', ssid: 'xiaozhi-web-test', rssi: 0, channel: 0, ip: '192.168.1.1', mac: cfg.deviceMac },
        flash_size: 0, minimum_free_heap_size: 0, mac_address: cfg.deviceMac,
        chip_model_name: '', chip_info: { model: 0, cores: 0, revision: 0, features: 0 },
        partition_table: [{ label: '', type: 0, subtype: 0, address: 0, size: 0 }]
      })
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    const ws = json?.websocket;
    if (!ws?.url) return null;

    const u = new URL(ws.url);
    if (ws.token) {
      const tok = ws.token.startsWith('Bearer ') ? ws.token : `Bearer ${ws.token}`;
      u.searchParams.append('authorization', tok);
    }
    u.searchParams.append('device-id', cfg.deviceId);
    u.searchParams.append('client-id', cfg.clientId);

    return { wsUrl: u.toString() };
  } catch (e) {
    return null;
  }
}

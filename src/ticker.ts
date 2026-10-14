/**
 * Web Worker ベースのティッカー。
 * バックグラウンドタブではメインスレッドの setInterval が強く間引かれるため、
 * Worker からの tick でPiP描画・残り時間計算を駆動する（時間そのものは endsAt から算出）。
 */
export function createTicker(cb: () => void, ms: number): () => void {
  try {
    const code = `let t=null;onmessage=function(e){if(e.data==='start'){clearInterval(t);t=setInterval(function(){postMessage('tick')},${ms});}else{clearInterval(t);}};`;
    const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    const worker = new Worker(url);
    worker.onmessage = () => cb();
    worker.postMessage('start');
    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = window.setInterval(cb, ms);
    return () => window.clearInterval(id);
  }
}

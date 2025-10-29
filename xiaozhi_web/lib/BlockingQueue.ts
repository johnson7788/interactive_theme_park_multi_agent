// lib/BlockingQueue.ts
export default class BlockingQueue<T=any> {
  private items: T[] = [];
  private waiters: { resolve: (v:T[])=>void; reject:(e:any)=>void; min:number; timer:any; onTimeout?: (count:number)=>void }[] = [];
  private emptyPromise: Promise<void> | null = null;
  private emptyResolve: (()=>void) | null = null;

  enqueue(...vals: T[]) {
    if (!vals || vals.length===0) return;
    this.items.push(...vals);
    if (this.emptyResolve) {
      this.emptyResolve(); this.emptyResolve=null; this.emptyPromise=null;
    }
    this.wake();
  }

  async dequeue(min=1, timeout=Infinity, onTimeout?: (count:number)=>void): Promise<T[]> {
    if (this.items.length===0) {
      if (!this.emptyPromise) this.emptyPromise = new Promise(r=> (this.emptyResolve=r));
      await this.emptyPromise;
    }
    if (this.items.length>=min) return this.flush();

    return new Promise((resolve, reject)=>{
      const w = { resolve, reject, min, timer:null as any, onTimeout };
      if (Number.isFinite(timeout)) {
        w.timer = setTimeout(()=>{
          this.remove(w);
          if (onTimeout) onTimeout(this.items.length);
          resolve(this.flush());
        }, timeout as number);
      }
      this.waiters.push(w);
    });
  }

  private waitForFirst() {
    if (!this.emptyPromise) this.emptyPromise = new Promise(r=> (this.emptyResolve=r));
    return this.emptyPromise;
  }

  private wake() {
    for (let i=this.waiters.length-1;i>=0;i--) {
      const w = this.waiters[i];
      if (this.items.length>=w.min) {
        this.remove(w); w.resolve(this.flush());
      }
    }
  }

  private remove(w:any) {
    const i = this.waiters.indexOf(w);
    if (i!==-1) {
      this.waiters.splice(i,1);
      if (w.timer) clearTimeout(w.timer);
    }
  }

  private flush(): T[] {
    const snap = [...this.items];
    this.items.length = 0;
    return snap;
  }

  get length() { return this.items.length; }
}

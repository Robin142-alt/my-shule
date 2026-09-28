import { MyShuleMark } from "@/components/brand/myshule-brand";
import styles from "./workspace-loading.module.css";

/** Shared, data-free fallback for route, session and dashboard-code loading. */
export function WorkspaceLoading() {
  return (
    <div className={styles.screen} data-testid="workspace-loading">
      <div className={styles.content} role="status" aria-live="polite" aria-label="Loading MyShule">
        <div className={styles.emblem} aria-hidden="true">
          <span className={styles.orbit} />
          <MyShuleMark size={64} preload />
        </div>
        <p className={styles.brand}>My<span>Shule</span></p>
        <p className={styles.caption}>Getting your workspace ready</p>
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.toolbar}>
            <span /><span /><span />
            <div className={styles.toolbarLine} />
          </div>
          <div className={styles.workspace}>
            <div className={styles.sidebar}>
              <span /><span /><span /><span />
            </div>
            <div className={styles.body}>
              <div className={styles.heading} />
              <div className={styles.tiles}><span /><span /><span /></div>
              <div className={styles.row} /><div className={styles.row} /><div className={styles.row} />
            </div>
          </div>
          <div className={styles.sweep} />
        </div>
        <div className={styles.activity} aria-hidden="true"><span /><span /><span /></div>
      </div>
    </div>
  );
}

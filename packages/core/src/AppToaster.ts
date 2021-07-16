import { IToaster, IToastOptions, IToastProps, Position, Toaster } from '@blueprintjs/core';

export const AppToaster = new (class implements IToaster {
  toaster: IToaster | undefined;

  init(container: HTMLElement = document.body) {
    if (!this.toaster) {
      this.toaster = Toaster.create(
        {
          className: 'toaster',
          position: Position.BOTTOM_RIGHT,
        },
        container
      );
    }
  }

  clear(): void {
    this.toaster?.clear();
  }

  dismiss(key: string): void {
    this.toaster?.dismiss(key);
  }

  getToasts(): IToastOptions[] {
    return this.toaster?.getToasts() ?? [];
  }

  show(props: IToastProps, key?: string): string {
    return this.toaster?.show(props, key) || '';
  }
})();

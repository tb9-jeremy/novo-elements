import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, TemplateRef, ViewChild,
  ViewContainerRef
} from '@angular/core';
import {
  ConnectedPositionStrategy, HorizontalConnectionPos, Overlay, OverlayConfig, OverlayRef, ScrollStrategy, VerticalConnectionPos,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'novo-overlay-template',
  template: `
    <ng-template>
      <div class="novo-overlay-panel" role="listbox" [id]="id" #panel>
        <ng-content></ng-content>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovoOverlayTemplateComponent implements OnDestroy {
  public id: string = `novo-overlay-${Date.now()}`;

  @ViewChild(TemplateRef) public template: TemplateRef<any>;
  @ViewChild('panel') public panel: ElementRef;

  @Input() public position: string = 'default';
  @Input() public scrollStrategy: 'reposition' | 'block' | 'close' = 'reposition';
  @Input() public width: number;
  @Input() public height: number;
  @Input() public closeOnSelect: boolean = true;

  @Input()
  public set parent(value: ElementRef) {
    this._parent = value;
    this.checkSizes();
  }

  public get parent(): ElementRef {
    return this._parent;
  }

  private _parent: ElementRef;

  @Output() public select: EventEmitter<any> = new EventEmitter();
  @Output() public closing: EventEmitter<any> = new EventEmitter();

  public overlayRef: OverlayRef | null;
  public portal: any;

  constructor(private overlay: Overlay,
              private viewContainerRef: ViewContainerRef,
              private zone: NgZone,
              private changeDetectorRef: ChangeDetectorRef) {}

  public ngOnDestroy(): void {
    this.destroyPanel();
  }

  get panelOpen(): boolean {
    return this.overlayRef && this.overlayRef.hasAttached();
  }

  public openPanel(): void {
    if (!this.overlayRef) {
      this.createOverlay(this.template);
    } else {
      this.checkSizes();
    }
    if (this.overlayRef && !this.overlayRef.hasAttached()) {
      this.overlayRef.attach(this.portal);
    }
    this.changeDetectorRef.markForCheck();
    setTimeout(() => {
      if (this.overlayRef) {
        this.overlayRef.updatePosition();
      }
    });
  }

  public closePanel(): void {
    this.zone.run(() => {
      if (this.overlayRef && this.overlayRef.hasAttached()) {
        this.overlayRef.detach();
      }
      this.closing.emit(true);
      if (this.panelOpen) {
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  private createOverlay(template: TemplateRef<any>): void {
    this.portal = new TemplatePortal(template, this.viewContainerRef);
    this.overlayRef = this.overlay.create(this.getOverlayConfig());
    this.overlayRef.backdropClick().subscribe(() => this.closePanel());
  }

  private destroyPanel(): void {
    if (this.overlayRef) {
      this.closePanel();
      this.overlayRef.dispose();
      this.overlayRef = undefined;
    }
  }

  private getOverlayConfig(): OverlayConfig {
    const config: OverlayConfig = new OverlayConfig();

    if (!this.width) {
      config.width = this.getHostWidth();
    } else {
      config.width = this.width;
    }

    if (this.height) {
      config.height = this.height;
    }

    config.positionStrategy = this.getPosition();
    config.hasBackdrop = true;
    config.backdropClass = 'novo-overlay-transparent-backdrop';
    config.direction = 'ltr';
    config.scrollStrategy = this.getScrollStrategy();

    return config;
  }

  private getPosition(): ConnectedPositionStrategy {
    if (this.position === 'right') {
      let [originX, originFallbackX]: HorizontalConnectionPos[] = ['end', 'start'];

      let [overlayY, overlayFallbackY]: VerticalConnectionPos[] = ['bottom', 'bottom'];

      let [originY, originFallbackY] = [overlayY, overlayFallbackY];
      let [overlayX, overlayFallbackX] = [originX, originFallbackX];

      return this.overlay
        .position()
        .connectedTo(this.getConnectedElement(), { originX, originY }, { overlayX, overlayY })
        .withDirection('ltr')
        .withFallbackPosition({ originX: originFallbackX, originY }, { overlayX: overlayFallbackX, overlayY })
        .withFallbackPosition({ originX, originY: originFallbackY }, { overlayX, overlayY: overlayFallbackY })
        .withFallbackPosition(
          { originX: originFallbackX, originY: originFallbackY },
          { overlayX: overlayFallbackX, overlayY: overlayFallbackY },
        );
    }
    return this.overlay
      .position()
      .connectedTo(this.getConnectedElement(), { originX: 'start', originY: 'bottom' }, { overlayX: 'start', overlayY: 'top' })
      .withDirection('ltr')
      .withFallbackPosition({ originX: 'start', originY: 'top' }, { overlayX: 'start', overlayY: 'bottom' });
  }

  private getScrollStrategy(): ScrollStrategy {
    switch (this.scrollStrategy) {
      case 'block':
        return this.overlay.scrollStrategies.block();
      case 'reposition':
        return this.overlay.scrollStrategies.reposition();
      default:
        return this.overlay.scrollStrategies.close();
    }
  }

  private checkSizes(): void {
    if (this.overlayRef) {
      if (!this.width) {
        this.overlayRef.getConfig().width = this.getHostWidth();
      }
      if (this.height) {
        this.overlayRef.getConfig().height = this.height;
      }
      this.overlayRef.updateSize(this.overlayRef.getConfig());
      this.overlayRef.updatePosition();
      this.changeDetectorRef.markForCheck();
    }
  }

  private getConnectedElement(): ElementRef {
    return this.parent;
  }

  private getHostWidth(): number {
    return this.getConnectedElement().nativeElement.getBoundingClientRect().width;
  }
}

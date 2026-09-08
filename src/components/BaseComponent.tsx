import React from 'react';
import { Dimensions, ScaledSize, ViewStyle } from 'react-native';

/**
 * ============================================================================
 * GAME ON - COMPONENT OOP HIERARCHY
 * ============================================================================
 * Demonstrating the 4 Pillars of Object-Oriented Programming in UI:
 * 1. Abstraction: BaseComponent and specialized abstract sub-classes.
 * 2. Encapsulation: Internal dimension state, event listeners, and safe lifecycle management.
 * 3. Inheritance: BaseComponent -> BaseHeader / BaseModal / BaseCard / BaseBackground -> Concrete UI Classes.
 * 4. Polymorphism: Template method pattern via renderContent() and customizable lifecycle hooks.
 * ============================================================================
 */

export interface BaseComponentState {
  windowWidth: number;
  windowHeight: number;
}

/**
 * Abstract Base Class for all GameOn UI Components.
 * Encapsulates responsive window metrics, safe state updates, and standard lifecycle.
 */
export abstract class BaseComponent<P = {}, S extends BaseComponentState = BaseComponentState> extends React.Component<P, S> {
  protected isComponentMounted: boolean = false;
  private dimensionsSubscription: any = null;

  constructor(props: P) {
    super(props);
    const { width, height } = Dimensions.get('window');
    this.state = {
      windowWidth: width,
      windowHeight: height,
    } as S;
  }

  componentDidMount(): void {
    this.isComponentMounted = true;
    this.dimensionsSubscription = Dimensions.addEventListener('change', this.handleDimensionsChange);
    this.onComponentMounted();
  }

  componentWillUnmount(): void {
    this.isComponentMounted = false;
    if (this.dimensionsSubscription && typeof this.dimensionsSubscription.remove === 'function') {
      this.dimensionsSubscription.remove();
    }
    this.onComponentWillUnmount();
  }

  private handleDimensionsChange = ({ window }: { window: ScaledSize }): void => {
    if (this.isComponentMounted) {
      this.safeSetState((prevState) => ({
        ...prevState,
        windowWidth: window.width,
        windowHeight: window.height,
      }));
    }
  };

  /**
   * Safe setState that guards against state updates after unmount.
   */
  protected safeSetState(
    state: ((prevState: Readonly<S>, props: Readonly<P>) => S | null) | Partial<S> | null,
    callback?: () => void
  ): void {
    if (this.isComponentMounted) {
      this.setState(state as any, callback);
    }
  }

  // Encapsulated Responsive Helpers
  public isMobile(): boolean {
    return this.state.windowWidth < 480;
  }

  public isTablet(): boolean {
    return this.state.windowWidth >= 480 && this.state.windowWidth < 768;
  }

  public isDesktop(): boolean {
    return this.state.windowWidth >= 768;
  }

  public getWindowWidth(): number {
    return this.state.windowWidth;
  }

  public getWindowHeight(): number {
    return this.state.windowHeight;
  }

  // Optional polymorphic lifecycle hooks
  protected onComponentMounted(): void {}
  protected onComponentWillUnmount(): void {}

  /**
   * Template Method Pattern: Subclasses must provide their rendering implementation.
   */
  public abstract renderContent(): React.ReactNode;

  public render(): React.ReactNode {
    return this.renderContent();
  }
}

// ----------------------------------------------------------------------------
// SPECIALIZED ABSTRACT BASE CLASSES
// ----------------------------------------------------------------------------

export interface BaseHeaderProps {
  title: string;
  onBack?: () => void;
  accentColor?: string;
  style?: ViewStyle;
}

/**
 * BaseHeader: Abstract class for game and screen navigation headers.
 */
export abstract class BaseHeader<P extends BaseHeaderProps, S extends BaseComponentState = BaseComponentState> extends BaseComponent<P, S> {
  protected getTitle(): string {
    return this.props.title;
  }

  protected handleBackPress = (): void => {
    if (this.props.onBack) {
      this.props.onBack();
    }
  };
}

export interface BaseModalProps {
  visible: boolean;
  title?: string;
}

export interface BaseModalState extends BaseComponentState {
  isVisible: boolean;
}

/**
 * BaseModal: Abstract class for dialogs, overlays, and game-over modals.
 */
export abstract class BaseModal<P extends BaseModalProps, S extends BaseModalState = BaseModalState> extends BaseComponent<P, S> {
  constructor(props: P) {
    super(props);
    this.state = {
      ...this.state,
      isVisible: props.visible,
    };
  }

  componentDidUpdate(prevProps: P): void {
    if (prevProps.visible !== this.props.visible) {
      this.onVisibilityChanged(this.props.visible);
    }
  }

  protected onVisibilityChanged(visible: boolean): void {
    this.safeSetState({ isVisible: visible } as Partial<S>);
  }

  public isVisible(): boolean {
    return this.props.visible;
  }
}

export interface BaseCardProps {
  title: string;
  accentColor: string;
  cardWidth: number;
  delay?: number;
}

export interface BaseCardState extends BaseComponentState {
  isPressed: boolean;
}

/**
 * BaseCard: Abstract class for game cards and menu items.
 */
export abstract class BaseCard<P extends BaseCardProps, S extends BaseCardState = BaseCardState> extends BaseComponent<P, S> {
  constructor(props: P) {
    super(props);
    this.state = {
      ...this.state,
      isPressed: false,
    };
  }

  protected handlePressIn = (): void => {
    this.safeSetState({ isPressed: true } as Partial<S>);
    this.onPressIn();
  };

  protected handlePressOut = (): void => {
    this.safeSetState({ isPressed: false } as Partial<S>);
    this.onPressOut();
  };

  protected onPressIn(): void {}
  protected onPressOut(): void {}
}

export interface BaseBackgroundProps {
  autoScroll?: boolean;
}

/**
 * BaseBackground: Abstract class for cyber, starry, and animated game backgrounds.
 */
export abstract class BaseBackground<P extends BaseBackgroundProps, S extends BaseComponentState = BaseComponentState> extends BaseComponent<P, S> {}

declare module '@rails/actioncable' {
  export function createConsumer(url: string): Consumer

  export interface Consumer {
    subscriptions: Subscriptions
    disconnect(): void
  }

  export interface Subscriptions {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(channel: string | object, mixin: object): any
  }
}

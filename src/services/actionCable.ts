import { createConsumer } from '@rails/actioncable'

let consumer: ReturnType<typeof createConsumer> | null = null

function getConsumer() {
  if (!consumer) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/cable'
    consumer = createConsumer(wsUrl)
  }
  return consumer
}

export function subscribeToPullRequests(onUpdate: () => void): () => void {
  const subscription = getConsumer().subscriptions.create('PullRequestsChannel', {
    received() {
      onUpdate()
    },
    connected() {
      console.log('[ActionCable] Connected to PullRequestsChannel')
    },
    disconnected() {
      console.log('[ActionCable] Disconnected from PullRequestsChannel')
    },
  })

  return () => {
    subscription.unsubscribe()
  }
}

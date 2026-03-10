export default class WebhookManagerService {
  constructor({ eventBusService, logger, container, queueService }: any) {
    this.eventBusService = eventBusService
    this.logger = logger
    this.container = container
    this.queueService = queueService
    this.listeners = {}
  }

  /**
   * Register a webhook for a specific event
   */
  register(event, url) {
    if (!this.listeners[event]) this.listeners[event] = []

    const listener = async ({ event: evt, container }) => {
      try {
        const payload = evt?.data
        console.log(evt, 'EVEENT')
        await this.queueService.add(`webhook-${event}`, { url, payload })
      } catch (err) {
        this.logger.error(`Webhook listener failed for ${event}`, err)
      }
    }

    this.eventBusService.subscribe(event, listener)
    this.listeners[event].push({ url, listener })
    this.logger.info(`Webhook registered for ${event}: ${url}`)
  }

  unregister(event, url) {
    if (!this.listeners[event]) return

    const index = this.listeners[event].findIndex(l => l.url === url)
    if (index !== -1) {
      const { listener } = this.listeners[event][index]
      this.eventBusService.unsubscribe(event, listener)
      this.listeners[event].splice(index, 1)
      this.logger.info(`Webhook unregistered for ${event}: ${url}`)
    }
  }

  /**
   * Optional: auto-register default webhooks on load
   */
  loadDefaults(defaults = []) {
    defaults.forEach(d => this.register(d.event, d.url))
  }
}
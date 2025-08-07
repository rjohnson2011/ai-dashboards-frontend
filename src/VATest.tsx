// Test VA Components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'va-banner': any
      'va-alert': any
      'va-button': any
      'va-card': any
    }
  }
}

export function VATest() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>VA Component Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Banner Test</h2>
        <va-banner 
          headline="Test Banner"
          type="info"
        >
          This is a test banner
        </va-banner>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Alert Test</h2>
        <va-alert 
          status="info"
          visible="true"
        >
          <h3 slot="headline">Test Alert</h3>
          <p>This is a test alert</p>
        </va-alert>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Button Test</h2>
        <va-button text="Test Button" />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Card Test</h2>
        <va-card>
          <h3>Test Card</h3>
          <p>This is a test card</p>
        </va-card>
      </div>
    </div>
  )
}
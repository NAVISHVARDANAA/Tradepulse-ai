import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

type ProductErrorBoundaryProps = {
  children: ReactNode
  title?: string
}

type ProductErrorBoundaryState = {
  failed: boolean
}

export class ProductErrorBoundary extends Component<
  ProductErrorBoundaryProps,
  ProductErrorBoundaryState
> {
  state: ProductErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ProductErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TradePulse product section failed:', {
      name: error.name,
      message: error.message,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="product-error-boundary" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>{this.props.title ?? 'This product section is temporarily unavailable'}</strong>
            <span>Other TradePulse features remain available. Refresh to try again.</span>
          </div>
          <button type="button" className="secondary-button" onClick={() => this.setState({ failed: false })}>
            Try again
          </button>
        </section>
      )
    }

    return this.props.children
  }
}

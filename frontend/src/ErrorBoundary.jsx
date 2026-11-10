import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  render() {
    if (this.state.crashed) return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-lg font-semibold text-text-main mb-2">
            Something went wrong
          </h1>
          <button
            onClick={() => this.setState({ crashed: false })}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark"
          >
            Try again
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}
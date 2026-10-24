import { Component } from 'react';
import { AlertOctagon } from 'lucide-react';
import Button from './Button.jsx';
import { copy } from '../../constants/copy.js';

/** Catches render-time failures so a single broken view cannot blank the app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info?.componentStack);
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-dvh w-full items-center justify-center bg-canvas px-4 text-ink">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
            <AlertOctagon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold">{copy.states.crashTitle}</h1>
            <p className="text-sm leading-relaxed text-ink-muted">{copy.states.crashBody}</p>
          </div>
          <Button onClick={this.handleReload}>{copy.states.reload}</Button>
        </div>
      </div>
    );
  }
}

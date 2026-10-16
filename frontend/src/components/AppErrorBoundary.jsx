import React from 'react';
import { RefreshCw, MessageSquare } from 'lucide-react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Workspace rendering error:', error, info);
  }

  restartWorkspace = () => {
    this.setState({ hasError: false });
    window.location.assign('/chat');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-[#fcfcfc] p-6 text-slate-900">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-[#da7756]">
            <MessageSquare size={22} />
          </div>
          <h1 className="text-lg font-bold">Let’s restore your workspace</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your conversation is safe. Reload the workspace to continue from a clean view.
          </p>
          {this.state.error && (
            <div className="mt-3 text-left p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-mono overflow-auto max-h-36">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            type="button"
            onClick={this.restartWorkspace}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#da7756] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw size={16} /> Return to workspace
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;

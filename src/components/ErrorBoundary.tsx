import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--lor-bg)] px-4">
        <div className="lor-card w-full max-w-[520px] p-8 text-center">
          <p className="eyebrow-label">Lor&apos;Squad Wellness</p>
          <h1 className="mt-4 text-[2rem] font-bold">Une erreur a interrompu l&apos;application</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--lor-muted)]">
            {this.state.message || "Une erreur inattendue s&apos;est produite pendant le chargement de la page."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 inline-flex min-h-[46px] items-center justify-center rounded-[10px] bg-[var(--lor-gold)] px-5 font-['Syne'] text-sm font-bold text-[var(--lor-bg)] transition hover:brightness-110"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}

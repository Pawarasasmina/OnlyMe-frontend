import { Component } from "react";
import { reportError } from "../../services/monitoring";
export default class MonitoringErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { reportError(error); }
  render() { return this.state.failed ? <div role="alert" className="p-8"><p>This screen could not load.</p><button className="mt-4 rounded-xl border px-4 py-3" type="button" onClick={() => window.location.reload()}>Reload page</button></div> : this.props.children; }
}

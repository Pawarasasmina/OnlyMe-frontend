import { Link } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

function LoginPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-brand-mist/70">Hook this form to your real auth flow next.</p>
      <form className="mt-8 space-y-4">
        <Input label="Email" placeholder="you@example.com" type="email" />
        <Input label="Password" placeholder="Enter your password" type="password" />
        <Button className="w-full" type="submit">
          Sign in
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-brand-mist/70">
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/register">Create account</Link>
      </div>
    </div>
  );
}

export default LoginPage;

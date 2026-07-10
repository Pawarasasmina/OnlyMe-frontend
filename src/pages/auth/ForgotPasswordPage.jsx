import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Reset password</h1>
      <p className="mt-2 text-sm text-brand-mist/70">Password reset email flow can be added later.</p>
      <form className="mt-8 space-y-4">
        <Input label="Email" placeholder="you@example.com" type="email" />
        <Button className="w-full" type="submit">
          Send reset link
        </Button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;

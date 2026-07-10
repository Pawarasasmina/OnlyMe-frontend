import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

function RegisterPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-brand-mist/70">Start as a fan, creator, or admin placeholder account.</p>
      <form className="mt-8 space-y-4">
        <Input label="Name" placeholder="Your name" />
        <Input label="Username" placeholder="@handle" />
        <Input label="Email" placeholder="you@example.com" type="email" />
        <Input label="Password" placeholder="Minimum 8 characters" type="password" />
        <Button className="w-full" type="submit">
          Register
        </Button>
      </form>
    </div>
  );
}

export default RegisterPage;

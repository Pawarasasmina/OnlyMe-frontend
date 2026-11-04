/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

function ForgotPasswordPage() {
  __useUiLanguage();
  return (
    <div>
      <h1 className="text-3xl font-bold">{__msg("auth.resetPassword")}</h1>
      <p className="mt-2 text-sm text-brand-mist/70">{__msg("auth.passwordResetEmailFlowCanBeAddedLater")}</p>
      <form className="mt-8 space-y-4">
        <Input label={__msg("auth.email")} placeholder={__msg("auth.youExampleCom")} type="email" />
        <Button className="w-full" type="submit">{__msg("auth.sendResetLink")}</Button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;

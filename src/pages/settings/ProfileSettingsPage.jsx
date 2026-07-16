import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import ImageUploader from "../../components/profile/ImageUploader";
import ProfileCompletionCard from "../../components/profile/ProfileCompletionCard";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";

const settingsTabs = [
  { label: "Profile", to: "/settings" },
  { label: "Account", to: "/settings/account" },
  { label: "Privacy", to: "/settings/privacy" },
  { label: "Notifications", to: "/settings/notifications" },
];

const emptyForm = {
  displayName: "",
  username: "",
  bio: "",
  categoriesText: "",
  city: "",
  country: "",
  subscriptionPrice: "3.00",
  nsfwEnabled: false,
  freePreviewEnabled: true,
  messagingEnabled: true,
  ppmEnabled: false,
  ppmPrice: 10,
  profileVisibility: "private",
  preferredLanguage: "en",
  timezone: "UTC",
  phoneNumber: "",
  notificationPreferences: {
    email: true,
    inApp: true,
    marketing: false,
    security: true,
  },
  socialLinks: [],
};

function profileToForm(data) {
  const profile = data?.profile || {};

  return {
    ...emptyForm,
    displayName: profile.displayName || data?.account?.displayName || "",
    username: profile.username || data?.account?.username || "",
    bio: profile.bio || "",
    categoriesText: (profile.categories || []).join(", "),
    city: profile.city || "",
    country: profile.country || "",
    subscriptionPrice: ((profile.subscriptionPriceCents ?? 300) / 100).toFixed(2),
    nsfwEnabled: Boolean(profile.nsfwEnabled),
    freePreviewEnabled: profile.freePreviewEnabled ?? true,
    messagingEnabled: profile.messagingEnabled ?? true,
    ppmEnabled: Boolean(profile.ppmEnabled),
    ppmPrice: profile.ppmPrice ?? 10,
    profileVisibility: profile.profileVisibility || (data?.account?.role === "creator" ? "public" : "private"),
    preferredLanguage: profile.preferredLanguage || "en",
    timezone: profile.timezone || "UTC",
    phoneNumber: profile.phoneNumber || "",
    notificationPreferences: {
      ...emptyForm.notificationPreferences,
      ...(profile.notificationPreferences || {}),
    },
    socialLinks: profile.socialLinks?.length ? profile.socialLinks : [],
  };
}

function FieldError({ message }) {
  return message ? <p className="mt-2 text-sm text-red-300">{message}</p> : null;
}

function CheckboxField({ checked, disabled, label, name, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-brand-mist/80">{label}</span>
      <input checked={checked} disabled={disabled} name={name} onChange={onChange} type="checkbox" />
    </label>
  );
}

function ProfileSettingsPage({ creatorMode = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [success, setSuccess] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const accessToken = localStorage.getItem("onlyme_access_token");
  const hasApiToken = Boolean(accessToken);

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    enabled: Boolean(user && hasApiToken),
    retry: false,
  });

  const profileData = profileQuery.data || null;
  const role = profileData?.account?.role;

  useEffect(() => {
    if (user && !hasApiToken) {
      setUser(null);
      queryClient.removeQueries({ queryKey: ["profile", "me"] });
      navigate("/login", { replace: true, state: { from: location } });
      return;
    }

    if (profileQuery.error?.response?.status === 401) {
      setUser(null);
      queryClient.removeQueries({ queryKey: ["profile", "me"] });
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [hasApiToken, location, navigate, profileQuery.error, queryClient, setUser, user]);

  useEffect(() => {
    if (profileData && !dirty) {
      setForm(profileToForm(profileData));
    }
  }, [dirty, profileData]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  const updateMutation = useMutation({
    mutationFn: (payload) => profileService.updateMe(payload),
    onSuccess: (response) => {
      const data = response.data.data;

      queryClient.setQueryData(["profile", "me"], data);
      setUser({
        id: data.account.id,
        name: data.account.displayName,
        username: data.account.username,
        email: data.account.email,
        role: data.account.role,
        avatar: data.account.profilePhoto,
        isVerified: data.account.isVerified,
        status: data.account.status,
      });
      setForm(profileToForm(data));
      setDirty(false);
      setGlobalError("");
      setFieldErrors({});
      setSuccess("Profile saved.");
    },
    onError: (error) => {
      setSuccess("");
      setGlobalError(error.response?.data?.message || "Unable to save profile.");
    },
  });

  const avatarMutation = useMutation({
    mutationFn: profileService.uploadAvatar,
    onSuccess: handleProfileMutationSuccess("Profile photo updated."),
    onError: handleProfileMutationError,
  });

  const removeAvatarMutation = useMutation({
    mutationFn: profileService.removeAvatar,
    onSuccess: handleProfileMutationSuccess("Profile photo removed."),
    onError: handleProfileMutationError,
  });

  const coverMutation = useMutation({
    mutationFn: profileService.uploadCover,
    onSuccess: handleProfileMutationSuccess("Cover photo updated."),
    onError: handleProfileMutationError,
  });

  const removeCoverMutation = useMutation({
    mutationFn: profileService.removeCover,
    onSuccess: handleProfileMutationSuccess("Cover photo removed."),
    onError: handleProfileMutationError,
  });

  function handleProfileMutationSuccess(message) {
    return (response) => {
      const data = response.data.data;

      queryClient.setQueryData(["profile", "me"], data);
      setUser({
        id: data.account.id,
        name: data.account.displayName,
        username: data.account.username,
        email: data.account.email,
        role: data.account.role,
        avatar: data.account.profilePhoto,
        isVerified: data.account.isVerified,
        status: data.account.status,
      });
      setForm(profileToForm(data));
      setDirty(false);
      setGlobalError("");
      setSuccess(message);
    };
  }

  function handleProfileMutationError(error) {
    setSuccess("");
    setGlobalError(error.response?.data?.message || "Image update failed.");
  }

  const activeTab = useMemo(
    () => settingsTabs.find((tab) => location.pathname === tab.to) || settingsTabs[0],
    [location.pathname]
  );

  const updateField = ({ target }) => {
    const value = target.type === "checkbox" ? target.checked : target.value;

    setDirty(true);
    setSuccess("");
    setFieldErrors((current) => ({ ...current, [target.name]: "" }));
    setForm((current) => ({ ...current, [target.name]: value }));
  };

  const updateNotification = ({ target }) => {
    setDirty(true);
    setSuccess("");
    setForm((current) => ({
      ...current,
      notificationPreferences: {
        ...current.notificationPreferences,
        [target.name]: target.checked,
      },
    }));
  };

  const updateSocialLink = (index, key, value) => {
    setDirty(true);
    setSuccess("");
    setForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [key]: value } : link
      ),
    }));
  };

  const addSocialLink = () => {
    if (form.socialLinks.length >= 5) {
      setFieldErrors((current) => ({ ...current, socialLinks: "You can add up to 5 social links." }));
      return;
    }

    setDirty(true);
    setForm((current) => ({ ...current, socialLinks: [...current.socialLinks, { platform: "", url: "" }] }));
  };

  const removeSocialLink = (index) => {
    setDirty(true);
    setForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.filter((_link, linkIndex) => linkIndex !== index),
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!form.displayName.trim()) {
      errors.displayName = "Display name is required.";
    }

    if (role === "creator") {
      const categories = form.categoriesText
        .split(",")
        .map((category) => category.trim())
        .filter(Boolean);

      if (!categories.length) {
        errors.categoriesText = "Creators need at least one category.";
      }

      if (categories.length > 3) {
        errors.categoriesText = "Use up to 3 categories.";
      }

      const subscriptionPrice = Number(form.subscriptionPrice);

      if (Number.isNaN(subscriptionPrice) || subscriptionPrice < 3 || subscriptionPrice > 999.99) {
        errors.subscriptionPrice = "Monthly price must be between $3.00 and $999.99.";
      }

      if (form.ppmEnabled && (Number(form.ppmPrice) < 10 || Number(form.ppmPrice) > 1000)) {
        errors.ppmPrice = "PPM price must be between 10 and 1,000 coins.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    setSuccess("");
    setGlobalError("");

    if (!validateForm()) {
      return;
    }

    const payload = {
      displayName: form.displayName.trim(),
      preferredLanguage: form.preferredLanguage.trim() || "en",
      timezone: form.timezone.trim() || "UTC",
      notificationPreferences: form.notificationPreferences,
    };

    if (role === "creator") {
      const subscriptionPriceCents = Math.round(Number(form.subscriptionPrice) * 100);

      Object.assign(payload, {
        bio: form.bio.trim(),
        categories: form.categoriesText
          .split(",")
          .map((category) => category.trim())
          .filter(Boolean),
        city: form.city.trim(),
        country: form.country.trim(),
        socialLinks: form.socialLinks.filter((link) => link.platform.trim() || link.url.trim()),
        subscriptionPriceCents,
        nsfwEnabled: form.nsfwEnabled,
        freePreviewEnabled: form.freePreviewEnabled,
        messagingEnabled: form.messagingEnabled,
        ppmEnabled: form.ppmEnabled,
        ppmPrice: Number(form.ppmPrice),
        profileVisibility: form.profileVisibility,
      });
    }

    if (role === "fan") {
      Object.assign(payload, {
        bio: form.bio.trim(),
        profileVisibility: form.profileVisibility,
      });
    }

    if (role === "admin") {
      Object.assign(payload, {
        phoneNumber: form.phoneNumber.trim(),
      });
    }

    updateMutation.mutate(payload);
  };

  const reset = () => {
    if (profileData) {
      setForm(profileToForm(profileData));
      setDirty(false);
      setFieldErrors({});
      setGlobalError("");
      setSuccess("");
    }
  };

  if (profileQuery.isLoading || (user && hasApiToken && !profileData)) {
    return <Loader label="Loading profile..." />;
  }

  if (profileQuery.isError) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5">
        <p className="text-red-200">Unable to load profile settings.</p>
        <Button className="mt-4" onClick={() => profileQuery.refetch()} type="button">
          Retry
        </Button>
      </div>
    );
  }

  if (!profileData) {
    return <Loader label="Redirecting to login..." />;
  }

  const account = profileData.account;
  const profile = profileData.profile;
  const uploading =
    avatarMutation.isPending || removeAvatarMutation.isPending || coverMutation.isPending || removeCoverMutation.isPending;

  return (
    <div className="space-y-6">
      {creatorMode ? <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="creator-eyebrow">Creator profile</p><h1 className="creator-page-title">Shape your public presence</h1><p className="creator-muted mt-2">Keep your identity, creator details, and membership options up to date.</p></div>{account.username ? <Link className="rounded-xl border border-sky-300/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-300/10" target="_blank" to={`/profile/${account.username}`}>Preview public profile</Link> : null}</div> : null}
      {!creatorMode ? <div className="flex flex-wrap gap-2">
        {settingsTabs.map((tab) => (
          <Link
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab.to === tab.to ? "bg-brand-primary text-white" : "bg-white/10 text-brand-mist/75 hover:bg-white/15"
            }`}
            key={tab.to}
            to={tab.to}
          >
            {tab.label}
          </Link>
        ))}
      </div> : null}

      {role !== "admin" ? <ProfileCompletionCard completion={profileData.completion} /> : null}

      {success ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}
      {globalError ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{globalError}</p> : null}

      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h2 className="text-xl font-semibold">General information</h2>
            <p className="mt-1 text-sm text-brand-mist/60">Your public identity and profile basics.</p>
          </div>
          {role === "creator" ? (
            <ImageUploader
              aspect="cover"
              disabled={uploading}
              label="Cover photo"
              onRemove={() => {
                if (window.confirm("Remove your cover photo?")) {
                  removeCoverMutation.mutate();
                }
              }}
              onUpload={(file) => {
                coverMutation.mutate(file);
              }}
              value={profile.coverPhoto}
            />
          ) : null}
          <ImageUploader
            disabled={uploading}
            label="Profile photo"
            onRemove={() => {
              if (window.confirm("Remove your profile photo?")) {
                removeAvatarMutation.mutate();
              }
            }}
            onUpload={(file) => {
              avatarMutation.mutate(file);
            }}
            value={account.profilePhoto}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Input label="Display name" name="displayName" onChange={updateField} value={form.displayName} />
              <FieldError message={fieldErrors.displayName} />
            </div>
            <div>
              <Input disabled label="Username (cannot be changed)" value={form.username} />
            </div>
          </div>

          {role !== "admin" ? (
            <label className="block space-y-2">
              <span className="text-sm text-brand-mist/80">Bio</span>
              <textarea
                className="min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary"
                maxLength={role === "creator" ? 500 : 300}
                name="bio"
                onChange={updateField}
                value={form.bio}
              />
              <span className="block text-right text-xs text-brand-mist/45">
                {form.bio.length}/{role === "creator" ? 500 : 300}
              </span>
            </label>
          ) : null}
        </section>

        {role === "creator" ? (
          <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
            <div>
              <h2 className="text-xl font-semibold">Creator settings</h2>
              <p className="mt-1 text-sm text-brand-mist/60">Subscription, discovery, and messaging settings.</p>
            </div>
            <div>
              <Input
                label="Categories or niches"
                name="categoriesText"
                onChange={updateField}
                placeholder="fitness, music, tutorials"
                value={form.categoriesText}
              />
              <FieldError message={fieldErrors.categoriesText} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="City" name="city" onChange={updateField} value={form.city} />
              <Input label="Country" name="country" onChange={updateField} value={form.country} />
              <div>
                <Input
                  label="Monthly subscription price"
                  min="3"
                  max="999.99"
                  name="subscriptionPrice"
                  onChange={updateField}
                  step="0.01"
                  type="number"
                  value={form.subscriptionPrice}
                />
                <FieldError message={fieldErrors.subscriptionPrice} />
              </div>
              <div>
                <Input
                  disabled={!form.ppmEnabled}
                  label="Pay-per-message price"
                  min="10"
                  max="1000"
                  name="ppmPrice"
                  onChange={updateField}
                  type="number"
                  value={form.ppmPrice}
                />
                <FieldError message={fieldErrors.ppmPrice} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <CheckboxField checked={form.freePreviewEnabled} label="Free preview content" name="freePreviewEnabled" onChange={updateField} />
              <CheckboxField checked={form.messagingEnabled} label="Messaging enabled" name="messagingEnabled" onChange={updateField} />
              <CheckboxField checked={form.ppmEnabled} label="Pay-per-message enabled" name="ppmEnabled" onChange={updateField} />
              <CheckboxField
                checked={form.nsfwEnabled}
                disabled={!account.isVerified}
                label={account.isVerified ? "NSFW profile" : "NSFW profile requires verification"}
                name="nsfwEnabled"
                onChange={updateField}
              />
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">Social links</h3>
                <Button onClick={addSocialLink} type="button" variant="secondary">
                  Add link
                </Button>
              </div>
              <FieldError message={fieldErrors.socialLinks} />
              {form.socialLinks.length ? (
                form.socialLinks.map((link, index) => (
                  <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]" key={`${index}-${link.platform}`}>
                    <Input
                      label="Platform"
                      onChange={(event) => updateSocialLink(index, "platform", event.target.value)}
                      value={link.platform}
                    />
                    <Input label="URL" onChange={(event) => updateSocialLink(index, "url", event.target.value)} value={link.url} />
                    <Button className="self-end" onClick={() => removeSocialLink(index)} type="button" variant="ghost">
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">No social links added.</p>
              )}
            </div>
          </section>
        ) : null}

        <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h2 className="text-xl font-semibold">Privacy and preferences</h2>
            <p className="mt-1 text-sm text-brand-mist/60">Visibility, language, time zone, and notification settings.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {role !== "admin" ? (
              <label className="block space-y-2">
                <span className="text-sm text-brand-mist/80">Profile visibility</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary"
                  name="profileVisibility"
                  onChange={updateField}
                  value={form.profileVisibility}
                >
                  <option className="bg-brand-dark" value="public">
                    Public
                  </option>
                  <option className="bg-brand-dark" value="private">
                    Private
                  </option>
                </select>
              </label>
            ) : null}
            <Input label="Preferred language" name="preferredLanguage" onChange={updateField} value={form.preferredLanguage} />
            <Input label="Time zone" name="timezone" onChange={updateField} value={form.timezone} />
            {role === "admin" ? <Input label="Phone number" name="phoneNumber" onChange={updateField} value={form.phoneNumber} /> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <CheckboxField checked={form.notificationPreferences.email} label="Email notifications" name="email" onChange={updateNotification} />
            <CheckboxField checked={form.notificationPreferences.inApp} label="In-app notifications" name="inApp" onChange={updateNotification} />
            {role === "admin" ? (
              <CheckboxField checked={form.notificationPreferences.security} label="Security alerts" name="security" onChange={updateNotification} />
            ) : (
              <CheckboxField checked={form.notificationPreferences.marketing} label="Product updates" name="marketing" onChange={updateNotification} />
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h2 className="text-xl font-semibold">Read-only account details</h2>
            <p className="mt-1 text-sm text-brand-mist/60">System-managed fields cannot be edited here.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input disabled label="Email" value={account.email} />
            <Input disabled label="Role" value={account.role} />
            <Input disabled label="Account status" value={account.status} />
            <Input disabled label="Joined" value={new Date(account.createdAt).toLocaleDateString()} />
            {role === "creator" ? <Input disabled label="Verification status" value={profile.verificationStatus} /> : null}
            {role === "admin" ? (
              <Input
                disabled
                label="Last login"
                value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Not recorded yet"}
              />
            ) : null}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={!dirty || updateMutation.isPending} onClick={reset} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProfileSettingsPage;

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import ImageUploader from "../../components/profile/ImageUploader";
import ProfileCompletionCard from "../../components/profile/ProfileCompletionCard";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import { normalizeUsername, validateUsernameFormat } from "../../utils/validators";
import SettingsNav from "./SettingsNav";

const emptyForm = {
  displayName: "",
  username: "",
  bio: "",
  orbitQuote: "",
  categoriesText: "",
  interestsText: "",
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
  socialLinks: [],
};

function profileToForm(data) {
  const profile = data?.profile || {};
  const account = data?.account || {};

  return {
    ...emptyForm,
    displayName: profile.displayName || account.displayName || "",
    username: profile.username || account.username || "",
    bio: profile.bio || "",
    orbitQuote: profile.orbitQuote || "",
    categoriesText: (profile.categories || []).join(", "),
    interestsText: (profile.interests || []).join(", "),
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

function syncAuthUser(data, previousUser) {
  return {
    ...previousUser,
    id: data.account.id,
    name: data.account.displayName,
    username: data.account.username,
    email: data.account.email,
    role: data.account.role,
    avatar: data.account.profilePhoto,
    isVerified: data.account.isVerified,
    status: data.account.status,
  };
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
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [coverProgress, setCoverProgress] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState({ state: "idle", message: "" });
  const hasApiToken = Boolean(localStorage.getItem("onlyme_access_token"));

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    enabled: Boolean(user && hasApiToken),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });

  const profileData = profileQuery.data || null;
  const role = profileData?.account?.role;
  const profilePhoto = profileData?.account?.profilePhoto || profileData?.profile?.profilePhoto || profileData?.account?.avatar || "";
  const coverPhoto = profileData?.profile?.coverPhoto || profileData?.profile?.cover || "";

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
    if (profileData && !dirty) setForm(profileToForm(profileData));
  }, [dirty, profileData]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!profileData) return undefined;
    const normalized = normalizeUsername(form.username);
    const original = normalizeUsername(profileData.account?.username);
    const format = validateUsernameFormat(form.username);

    if (normalized === original) {
      setUsernameStatus({ state: "unchanged", message: "This is your current username." });
      return undefined;
    }

    if (!format.valid) {
      setUsernameStatus({ state: "invalid", message: format.message });
      return undefined;
    }

    setUsernameStatus({ state: "checking", message: "Checking username availability..." });
    let ignored = false;
    const timer = window.setTimeout(() => {
      profileService.checkUsername(normalized)
        .then((response) => {
          if (ignored) return;
          const result = response.data.data;
          if (result.available) setUsernameStatus({ state: "available", message: "Username is available." });
          else if (result.reason === "reserved") setUsernameStatus({ state: "unavailable", message: "This username is reserved." });
          else setUsernameStatus({ state: "unavailable", message: "This username is already taken." });
        })
        .catch(() => {
          if (!ignored) setUsernameStatus({ state: "error", message: "Unable to check username right now." });
        });
    }, 450);

    return () => {
      ignored = true;
      window.clearTimeout(timer);
    };
  }, [form.username, profileData]);

  const handleProfileMutationSuccess = (message) => (response) => {
    const data = response.data.data;

    queryClient.setQueryData(["profile", "me"], data);
    queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    setUser(syncAuthUser(data, user));
    setForm(profileToForm(data));
    setDirty(false);
    setGlobalError("");
    setFieldErrors({});
    setSuccess(message);
  };

  const handleProfileMutationError = (error) => {
    const normalized = normalizeApiError(error, "The image could not be uploaded. Please try again.");
    setSuccess("");
    setGlobalError(normalized.message);
  };

  const updateMutation = useMutation({
    mutationFn: (payload) => profileService.updateMe(payload),
    onSuccess: handleProfileMutationSuccess("Profile saved."),
    onError: (error) => {
      const normalized = normalizeApiError(error, "Your profile could not be updated. Please try again.");
      setSuccess("");
      setGlobalError(normalized.message);
      setFieldErrors(normalized.errors || {});
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => profileService.uploadAvatar(file, (event) => {
      if (event.total) setAvatarProgress(Math.round((event.loaded * 100) / event.total));
    }),
    onSuccess: handleProfileMutationSuccess("Profile photo updated successfully."),
    onError: handleProfileMutationError,
    onSettled: () => setAvatarProgress(0),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: profileService.removeAvatar,
    onSuccess: handleProfileMutationSuccess("Profile photo removed."),
    onError: handleProfileMutationError,
  });

  const coverMutation = useMutation({
    mutationFn: (file) => profileService.uploadCover(file, (event) => {
      if (event.total) setCoverProgress(Math.round((event.loaded * 100) / event.total));
    }),
    onSuccess: handleProfileMutationSuccess("Cover image updated successfully."),
    onError: handleProfileMutationError,
    onSettled: () => setCoverProgress(0),
  });

  const removeCoverMutation = useMutation({
    mutationFn: profileService.removeCover,
    onSuccess: handleProfileMutationSuccess("Cover image removed."),
    onError: handleProfileMutationError,
  });

  const updateField = ({ target }) => {
    const value = target.type === "checkbox" ? target.checked : target.value;
    setDirty(true);
    setSuccess("");
    setFieldErrors((current) => ({ ...current, [target.name]: "" }));
    setForm((current) => ({ ...current, [target.name]: value }));
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
    const usernameFormat = validateUsernameFormat(form.username);

    if (!form.displayName.trim()) errors.displayName = "Display name is required.";
    if (!usernameFormat.valid) errors.username = usernameFormat.message;
    else if (!["unchanged", "available"].includes(usernameStatus.state)) {
      errors.username = usernameStatus.message || "Choose an available username.";
    }

    if (role === "creator") {
      const categories = form.categoriesText.split(",").map((category) => category.trim()).filter(Boolean);
      const subscriptionPrice = Number(form.subscriptionPrice);

      if (!categories.length) errors.categoriesText = "Creators need at least one category.";
      if (Number.isNaN(subscriptionPrice) || subscriptionPrice < 3 || subscriptionPrice > 999.99) {
        errors.subscriptionPrice = "Monthly price must be between $3.00 and $999.99.";
      }
      if (form.ppmEnabled && (Number(form.ppmPrice) < 10 || Number(form.ppmPrice) > 1000)) {
        errors.ppmPrice = "PPM price must be between 10 and 1,000 coins.";
      }
    }

    if (role === "fan") {
      const interests = form.interestsText.split(",").map((interest) => interest.trim()).filter(Boolean);
      if (interests.length > 8) errors.interestsText = "Use up to 8 interests.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    setSuccess("");
    setGlobalError("");

    if (!validateForm()) return;

    const payload = {
      displayName: form.displayName.trim(),
      username: normalizeUsername(form.username),
      preferredLanguage: form.preferredLanguage.trim() || "en",
      timezone: form.timezone.trim() || "UTC",
    };

    if (role === "creator") {
      Object.assign(payload, {
        bio: form.bio.trim(),
        orbitQuote: form.orbitQuote.trim(),
        categories: form.categoriesText.split(",").map((category) => category.trim()).filter(Boolean),
        city: form.city.trim(),
        country: form.country.trim(),
        socialLinks: form.socialLinks.filter((link) => link.platform.trim() || link.url.trim()),
        subscriptionPriceCents: Math.round(Number(form.subscriptionPrice) * 100),
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
        interests: form.interestsText.split(",").map((interest) => interest.trim()).filter(Boolean),
        city: form.city.trim(),
        country: form.country.trim(),
        profileVisibility: form.profileVisibility,
      });
    }

    if (role === "admin") {
      Object.assign(payload, {
        bio: form.bio.trim(),
        phoneNumber: form.phoneNumber.trim(),
      });
    }

    updateMutation.mutate(payload);
  };

  const reset = () => {
    if (!profileData) return;
    setForm(profileToForm(profileData));
    setDirty(false);
    setFieldErrors({});
    setGlobalError("");
    setSuccess("");
  };

  if (profileQuery.isLoading || (user && hasApiToken && !profileData)) return <Loader label="Loading profile..." />;

  if (profileQuery.isError) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5">
        <p className="text-red-200">Unable to load profile settings.</p>
        <Button className="mt-4" onClick={() => profileQuery.refetch()} type="button">Retry</Button>
      </div>
    );
  }

  if (!profileData) return <Loader label="Redirecting to login..." />;

  const account = profileData.account;
  const profile = profileData.profile;
  const uploading =
    avatarMutation.isPending || removeAvatarMutation.isPending || coverMutation.isPending || removeCoverMutation.isPending;

  return (
    <div className="space-y-6">
      {creatorMode ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="creator-eyebrow">Creator profile</p>
            <h1 className="creator-page-title">Shape your public presence</h1>
            <p className="creator-muted mt-2">Keep your identity, creator details, and membership options up to date.</p>
          </div>
          {account.username ? (
            <Link className="rounded-xl border border-sky-300/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-300/10" target="_blank" to={`/profile/${account.username}`}>
              Preview public profile
            </Link>
          ) : null}
        </div>
      ) : <SettingsNav />}

      {role !== "admin" ? <ProfileCompletionCard completion={profileData.completion} /> : null}
      {success ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}
      {globalError ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{globalError}</p> : null}

      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h2 className="text-xl font-semibold">General information</h2>
            <p className="mt-1 text-sm text-brand-mist/60">Your public identity and profile basics.</p>
          </div>

          {role !== "admin" ? (
            <ImageUploader
              aspect="cover"
              disabled={uploading}
              error={coverMutation.isError ? globalError : ""}
              label="Cover photo"
              onRemove={() => {
                if (window.confirm("Remove your cover photo?")) removeCoverMutation.mutate();
              }}
              onUpload={(file) => coverMutation.mutateAsync(file)}
              progress={coverProgress}
              status={coverMutation.isPending ? "Uploading cover image..." : ""}
              value={coverPhoto}
            />
          ) : null}

          <ImageUploader
            disabled={uploading}
            error={avatarMutation.isError ? globalError : ""}
            label="Profile photo"
            onRemove={() => {
              if (window.confirm("Remove your profile photo?")) removeAvatarMutation.mutate();
            }}
            onUpload={(file) => avatarMutation.mutateAsync(file)}
            progress={avatarProgress}
            status={avatarMutation.isPending ? "Uploading profile photo..." : ""}
            value={profilePhoto}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Input label="Display name" name="displayName" onChange={updateField} value={form.displayName} />
              <FieldError message={fieldErrors.displayName} />
            </div>
            <div>
              <Input
                aria-describedby="username-status"
                aria-invalid={Boolean(fieldErrors.username)}
                label="Username"
                name="username"
                onChange={updateField}
                value={form.username}
              />
              {usernameStatus.message ? (
                <p
                  aria-live="polite"
                  className={`mt-2 text-sm ${["available", "unchanged"].includes(usernameStatus.state) ? "text-emerald-300" : usernameStatus.state === "checking" ? "text-brand-mist/70" : "text-red-300"}`}
                  id="username-status"
                  role="status"
                >
                  {usernameStatus.message}
                </p>
              ) : null}
              <FieldError message={fieldErrors.username} />
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-brand-mist/80">Bio</span>
            <textarea
              className="min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary"
              maxLength={role === "creator" ? 500 : 300}
              name="bio"
              onChange={updateField}
              value={form.bio}
            />
            <span className="block text-right text-xs text-brand-mist/45">{form.bio.length}/{role === "creator" ? 500 : 300}</span>
          </label>
        </section>

        {role === "creator" ? (
          <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
            <div>
              <h2 className="text-xl font-semibold">Creator profile</h2>
              <p className="mt-1 text-sm text-brand-mist/60">Public creator details and membership options.</p>
            </div>
            <label className="block space-y-2">
              <span className="text-sm text-brand-mist/80">Creator headline</span>
              <textarea className="min-h-20 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary" maxLength={240} name="orbitQuote" onChange={updateField} value={form.orbitQuote} />
            </label>
            <div>
              <Input label="Categories or niches" name="categoriesText" onChange={updateField} placeholder="fitness, music, tutorials" value={form.categoriesText} />
              <FieldError message={fieldErrors.categoriesText} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="City" name="city" onChange={updateField} value={form.city} />
              <Input label="Country" name="country" onChange={updateField} value={form.country} />
              <div>
                <Input label="Monthly subscription price" min="3" max="999.99" name="subscriptionPrice" onChange={updateField} step="0.01" type="number" value={form.subscriptionPrice} />
                <FieldError message={fieldErrors.subscriptionPrice} />
              </div>
              <div>
                <Input disabled={!form.ppmEnabled} label="Pay-per-message price" min="10" max="1000" name="ppmPrice" onChange={updateField} type="number" value={form.ppmPrice} />
                <FieldError message={fieldErrors.ppmPrice} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <CheckboxField checked={form.freePreviewEnabled} label="Free preview content" name="freePreviewEnabled" onChange={updateField} />
              <CheckboxField checked={form.messagingEnabled} label="Messaging enabled" name="messagingEnabled" onChange={updateField} />
              <CheckboxField checked={form.ppmEnabled} label="Pay-per-message enabled" name="ppmEnabled" onChange={updateField} />
              <CheckboxField checked={form.nsfwEnabled} disabled={!account.isVerified} label={account.isVerified ? "NSFW profile" : "NSFW profile requires verification"} name="nsfwEnabled" onChange={updateField} />
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">Social links</h3>
                <Button onClick={addSocialLink} type="button" variant="secondary">Add link</Button>
              </div>
              <FieldError message={fieldErrors.socialLinks} />
              {form.socialLinks.length ? form.socialLinks.map((link, index) => (
                <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]" key={`${index}-${link.platform}`}>
                  <Input label="Platform" onChange={(event) => updateSocialLink(index, "platform", event.target.value)} value={link.platform} />
                  <Input label="URL" onChange={(event) => updateSocialLink(index, "url", event.target.value)} value={link.url} />
                  <Button className="self-end" onClick={() => removeSocialLink(index)} type="button" variant="ghost">Remove</Button>
                </div>
              )) : <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">No social links added.</p>}
            </div>
          </section>
        ) : null}

        {role === "fan" ? (
          <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
            <div>
              <h2 className="text-xl font-semibold">Fan details</h2>
              <p className="mt-1 text-sm text-brand-mist/60">Interests and location help tune your orbit.</p>
            </div>
            <div>
              <Input label="Interests" name="interestsText" onChange={updateField} placeholder="music, fitness, film" value={form.interestsText} />
              <FieldError message={fieldErrors.interestsText} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="City" name="city" onChange={updateField} value={form.city} />
              <Input label="Country" name="country" onChange={updateField} value={form.country} />
            </div>
          </section>
        ) : null}

        <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h2 className="text-xl font-semibold">Profile preferences</h2>
            <p className="mt-1 text-sm text-brand-mist/60">Public visibility, language, and time zone.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {role !== "admin" ? (
              <label className="block space-y-2">
                <span className="text-sm text-brand-mist/80">Profile visibility</span>
                <select className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary" name="profileVisibility" onChange={updateField} value={form.profileVisibility}>
                  <option className="bg-brand-dark" value="public">Public</option>
                  <option className="bg-brand-dark" value="private">Private</option>
                </select>
              </label>
            ) : null}
            <Input label="Preferred language" name="preferredLanguage" onChange={updateField} value={form.preferredLanguage} />
            <Input label="Time zone" name="timezone" onChange={updateField} value={form.timezone} />
            {role === "admin" ? <Input label="Phone number" name="phoneNumber" onChange={updateField} value={form.phoneNumber} /> : null}
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
            {role === "admin" ? <Input disabled label="Last login" value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Not recorded yet"} /> : null}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={!dirty || updateMutation.isPending} onClick={reset} type="button" variant="ghost">Cancel</Button>
          <Button disabled={updateMutation.isPending || usernameStatus.state === "checking"} type="submit">
            {updateMutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProfileSettingsPage;

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiChevronLeft, FiChevronRight, FiGift, FiX } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import ProfileImageCropper from "../../components/profile/ProfileImageCropper";
import StatusPicker from "../../components/stories/StatusPicker";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";

const emptyForm = {
  firstName: "",
  lastName: "",
  username: "",
  bio: "",
  categoriesText: "",
  locationText: "",
  city: "",
  country: "",
  languagesText: "",
  website: "",
  email: "",
  phoneNumber: "",
  whatsapp: "",
  profileVisibility: "private",
  orbitVisible: true,
  preferredLanguage: "en",
  timezone: "UTC",
  notificationPreferences: {
    email: true,
    inApp: true,
    marketing: false,
  },
};

function splitDisplayName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function profileToForm(data, privacyData) {
  const profile = data?.profile || {};
  const account = data?.account || {};
  const names = splitDisplayName(profile.displayName || account.displayName || "");
  const socialLinks = profile.socialLinks || [];
  const website = socialLinks[0]?.url || "";
  const languageSource = profile.preferredLanguage || "en";

  return {
    ...emptyForm,
    ...names,
    username: profile.username || account.username || "",
    bio: profile.bio || "",
    categoriesText: (profile.categories || []).join(", "),
    locationText: [profile.city, profile.country].filter(Boolean).join(", "),
    city: profile.city || "",
    country: profile.country || "",
    languagesText: languageSource === "en" ? "English" : languageSource,
    website,
    email: account.email || "",
    phoneNumber: profile.phoneNumber || "",
    whatsapp: profile.whatsapp || "",
    profileVisibility: privacyData?.profileVisibility || profile.profileVisibility || (account.role === "creator" ? "public" : "private"),
    orbitVisible: privacyData?.privacySettings?.allowDiscovery !== false,
    preferredLanguage: languageSource,
    timezone: profile.timezone || "UTC",
    notificationPreferences: {
      ...emptyForm.notificationPreferences,
      ...(profile.notificationPreferences || {}),
    },
  };
}

function displayNameFrom(form) {
  return [form.firstName, form.lastName].map((part) => part.trim()).filter(Boolean).join(" ");
}

function segmentedFromVisibility(value) {
  return value === "public" ? "everyone" : "only_me";
}

function visibilityFromSegment(value) {
  return value === "everyone" ? "public" : "private";
}

function Field({ className = "", disabled = false, label, name, onChange, placeholder = "", value }) {
  return (
    <label className={`edit-profile-field ${className}`}>
      <span>{label}</span>
      <input disabled={disabled} name={name} onChange={onChange} placeholder={placeholder} value={value || ""} />
    </label>
  );
}

function PhotoRow({ cover = false, disabled, fileRef, label, onChange, src, subtitle }) {
  return (
    <div className="edit-profile-photo-row">
      {cover ? (
        <span className="edit-profile-cover-thumb">
          {src ? <img alt="" src={resolveMediaUrl(src)} /> : null}
        </span>
      ) : (
        <FanAvatar name={label} size="h-[70px] w-[70px]" src={resolveMediaUrl(src)} />
      )}
      <span className="min-w-0 flex-1">
        <b>{label}</b>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
      <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled} onChange={onChange} ref={fileRef} type="file" />
      <button className="edit-profile-pill-button" disabled={disabled} onClick={() => fileRef.current?.click()} type="button">{src ? "Change" : "Add"}</button>
    </div>
  );
}

function SettingsRow({ subtitle, title, to }) {
  return (
    <Link className="edit-profile-settings-row" to={to}>
      <span>
        <b>{title}</b>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
      <FiChevronRight />
    </Link>
  );
}

function Segmented({ label, onChange, value }) {
  const options = [
    ["everyone", "Everyone"],
    ["followers", "Followers"],
    ["only_me", "Only me"],
  ];
  return (
    <div className="edit-profile-privacy-control">
      <p>{label}</p>
      <div>
        {options.map(([option, text]) => (
          <button className={value === option ? "is-active" : ""} key={option} onClick={() => onChange(option)} type="button">{text}</button>
        ))}
      </div>
    </div>
  );
}

const notificationRows = [
  ["email", "Email notifications", "Account updates and summaries"],
  ["inApp", "In-app notifications", "Activity while you use Atseen"],
  ["messages", "Messages", "New messages and replies"],
  ["directAccess", "Direct Access & income", "Requests, calls and earnings"],
  ["marketing", "Product announcements", "New features and occasional news"],
];

function NotificationSheet({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["settings", "notifications"],
    queryFn: () => profileService.getNotificationSettings().then((response) => response.data.data),
    enabled: isOpen,
  });
  const mutation = useMutation({
    mutationFn: (next) => profileService.updateNotificationSettings({ notificationPreferences: next }),
    onSuccess: (response) => {
      const data = response.data.data;
      queryClient.setQueryData(["settings", "notifications"], data);
      setPreferences(data.notificationPreferences || {});
      setError("");
    },
    onError: () => setError("Unable to save notification settings. Please try again."),
  });

  useEffect(() => {
    if (isOpen && query.data) setPreferences(query.data.notificationPreferences || {});
  }, [isOpen, query.data]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggle = (key) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setError("");
    mutation.mutate(next);
  };

  return <div aria-labelledby="profile-notifications-title" aria-modal="true" className="profile-notification-layer" role="dialog">
    <button aria-label="Close notifications" className="profile-notification-dim" onClick={onClose} type="button" />
    <section className="profile-notification-sheet">
      <span aria-hidden="true" className="profile-notification-grab" />
      <div className="profile-notification-heading"><div><h2 id="profile-notifications-title">Notifications</h2><p>Choose what deserves your attention.</p></div><button onClick={onClose} type="button">Done</button></div>
      {query.isLoading ? <LoadingSkeleton className="mt-5 h-56" /> : <div className="profile-notification-list">
        {notificationRows.map(([key, title, subtitle]) => <button disabled={mutation.isPending} key={key} onClick={() => toggle(key)} type="button"><span><b>{title}</b><small>{subtitle}</small></span><i aria-hidden="true" className={preferences[key] ? "is-on" : ""}><em /></i></button>)}
      </div>}
      {query.isError ? <p className="profile-notification-error">Unable to load notification settings.</p> : null}
      {error ? <p className="profile-notification-error">{error}</p> : null}
      <p className="profile-notification-note">Views are always silent — never a notification.</p>
    </section>
  </div>;
}

function GiftSettingsComingSoon({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 px-0 pt-10 sm:px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog">
      <section className="w-full max-w-[548px] rounded-t-[24px] border border-b-0 border-white/[0.09] bg-[#1d2430] px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.45)]" onMouseDown={(event) => event.stopPropagation()}>
        <div aria-hidden="true" className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/35" />
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-atseen-blue/15 text-xl text-atseen-blue"><FiGift /></div>
          <button aria-label="Close gift settings" className="grid h-9 w-9 place-items-center rounded-full text-atseen-muted hover:bg-white/5 hover:text-white" onClick={onClose} type="button"><FiX /></button>
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-atseen-blue">Coming soon</p>
        <h2 className="mt-2 text-2xl font-black text-white">Gift settings</h2>
        <p className="mt-3 text-sm leading-6 text-atseen-muted">Custom gifts and gift preferences are being prepared. This feature will become available after the beta release.</p>
        <button className="mt-7 w-full rounded-xl bg-atseen-blue py-3 text-sm font-black text-atseen-bg" onClick={onClose} type="button">Got it</button>
      </section>
    </div>
  );
}

function normalizeLanguage(text) {
  const value = String(text || "")
    .split(/[,\u00b7]/)
    .map((part) => part.trim())
    .filter(Boolean)[0] || "en";
  const codes = { english: "en", "العربية": "ar", arabic: "ar", "русский": "ru", russian: "ru", "español": "es", spanish: "es", "français": "fr", french: "fr", "português": "pt", portuguese: "pt" };
  return codes[value.toLowerCase()] || value.toLowerCase();
}

function ProfileSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const statusContext = useOutletContext();
  const queryClient = useQueryClient();
  const { setUser, user } = useAuth();
  const avatarInput = useRef(null);
  const coverInput = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [giftSettingsOpen, setGiftSettingsOpen] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const accessToken = localStorage.getItem("onlyme_access_token");
  const backTarget = new URLSearchParams(location.search).get("from") === "settings" ? "/settings" : "/profile";

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    enabled: Boolean(user && accessToken),
    retry: false,
  });

  const privacyQuery = useQuery({
    queryKey: ["settings", "privacy"],
    queryFn: () => profileService.getPrivacySettings().then((response) => response.data.data),
    enabled: Boolean(user && accessToken),
    retry: false,
  });

  useEffect(() => {
    if (user && !accessToken) {
      setUser(null);
      queryClient.removeQueries({ queryKey: ["profile", "me"] });
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [accessToken, location, navigate, queryClient, setUser, user]);

  useEffect(() => {
    if ((profileQuery.error || privacyQuery.error)?.response?.status === 401) {
      setUser(null);
      queryClient.removeQueries({ queryKey: ["profile", "me"] });
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [location, navigate, privacyQuery.error, profileQuery.error, queryClient, setUser]);

  useEffect(() => {
    if (profileQuery.data && privacyQuery.data && !dirty) {
      setForm(profileToForm(profileQuery.data, privacyQuery.data));
    }
  }, [dirty, privacyQuery.data, profileQuery.data]);

  const account = profileQuery.data?.account || {};
  const profile = profileQuery.data?.profile || {};
  const role = account.role;
  const activeStatus = account.activeStatus || null;
  const profilePhoto = account.profilePhoto;
  const coverPhoto = profile.coverPhoto;

  const directSummary = useMemo(() => {
    if (role !== "creator") return "Available in Messages";
    const parts = [];
    if (profile.directAccessEnabled !== false) parts.push("On");
    if (profile.directAccessPriceStars) parts.push(`messages ${profile.directAccessPriceStars}`);
    if (profile.directCallEnabled) parts.push(`calls ${profile.directCallPriceStars || 500} / ${profile.directCallDurationMinutes || 5} min`);
    return parts.length ? parts.join(" - ") : "Off";
  }, [profile.directAccessEnabled, profile.directAccessPriceStars, profile.directCallDurationMinutes, profile.directCallEnabled, profile.directCallPriceStars, role]);

  const giftSummary = "Coffee - Keep Going - Big Support";
  const notificationSummary = [
    form.notificationPreferences.directAccess ? "Support" : "",
    form.notificationPreferences.inApp ? "Comments" : "",
    form.notificationPreferences.email ? "Messages" : "",
  ].filter(Boolean).join(" - ") || "Quiet";

  const updateField = ({ target }) => {
    setDirty(true);
    setMessage("");
    setError("");
    setForm((current) => ({ ...current, [target.name]: target.value }));
  };

  const setSavedVisibility = (value) => {
    setDirty(true);
    setForm((current) => ({ ...current, profileVisibility: visibilityFromSegment(value) }));
  };

  const setOrbitVisibility = (value) => {
    setDirty(true);
    setForm((current) => ({ ...current, orbitVisible: value !== "only_me" }));
  };


  const saveMutation = useMutation({
    mutationFn: async () => {
      const displayName = displayNameFrom(form);
      if (!displayName) throw new Error("First name is required.");
      const socialLinks = form.website.trim() ? [{ platform: "Website", url: form.website.trim() }] : [];
      const [city = "", ...countryParts] = form.locationText.split(",").map((part) => part.trim()).filter(Boolean);
      const profilePayload = {
        displayName,
        bio: form.bio.trim(),
        phoneNumber: form.phoneNumber.trim(),
        whatsapp: form.whatsapp.trim(),
        preferredLanguage: normalizeLanguage(form.languagesText || form.preferredLanguage),
        timezone: form.timezone.trim() || "UTC",
        notificationPreferences: form.notificationPreferences,
        profileVisibility: form.profileVisibility,
      };
      if (role === "creator") {
        Object.assign(profilePayload, {
          categories: form.categoriesText.split(",").map((item) => item.trim()).filter(Boolean),
          city,
          country: countryParts.join(", "),
          socialLinks,
          subscriptionPriceCents: profile.subscriptionPriceCents || 300,
          nsfwEnabled: Boolean(profile.nsfwEnabled),
          freePreviewEnabled: profile.freePreviewEnabled ?? true,
          messagingEnabled: profile.messagingEnabled ?? true,
          ppmEnabled: Boolean(profile.ppmEnabled),
          ppmPrice: profile.ppmPrice || 10,
        });
      }
      if (role === "fan") {
        Object.assign(profilePayload, {
          city,
          country: countryParts.join(", "),
        });
      }
      const [profileResponse, privacyResponse] = await Promise.all([
        profileService.updateMe(profilePayload),
        profileService.updatePrivacySettings({
          profileVisibility: form.profileVisibility,
          privacySettings: {
            ...(privacyQuery.data?.privacySettings || {}),
            allowDiscovery: form.orbitVisible,
          },
        }),
      ]);
      return { profile: profileResponse.data.data, privacy: privacyResponse.data.data };
    },
    onSuccess: ({ profile: data, privacy }) => {
      queryClient.setQueryData(["profile", "me"], data);
      queryClient.setQueryData(["settings", "privacy"], privacy);
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
      setUser({
        id: data.account.id,
        name: data.account.displayName,
        username: data.account.username,
        email: data.account.email,
        role: data.account.role,
        avatar: data.account.profilePhoto,
        isVerified: data.account.isVerified,
        status: data.account.status,
        creatorApprovalStatus: user?.creatorApprovalStatus,
      });
      setForm(profileToForm(data, privacy));
      setDirty(false);
      setError("");
      setMessage("Profile saved.");
    },
    onError: (requestError) => {
      setMessage("");
      setError(requestError.response?.data?.message || requestError.message || "Unable to save profile.");
    },
  });

  function handleProfileMutationSuccess(text) {
    return (response) => {
      const data = response.data.data;
      queryClient.setQueryData(["profile", "me"], data);
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      setUser({
        id: data.account.id,
        name: data.account.displayName,
        username: data.account.username,
        email: data.account.email,
        role: data.account.role,
        avatar: data.account.profilePhoto,
        isVerified: data.account.isVerified,
        status: data.account.status,
        creatorApprovalStatus: user?.creatorApprovalStatus,
      });
      setForm(profileToForm(data, privacyQuery.data));
      setDirty(false);
      setError("");
      setMessage(text);
    };
  }

  function handleProfileMutationError(requestError) {
    setMessage("");
    setError(requestError.response?.data?.message || "Image update failed.");
  }

  const avatarMutation = useMutation({
    mutationFn: profileService.uploadAvatar,
    onSuccess: handleProfileMutationSuccess("Profile photo updated."),
    onError: handleProfileMutationError,
  });
  const coverMutation = useMutation({
    mutationFn: profileService.uploadCover,
    onSuccess: handleProfileMutationSuccess("Cover photo updated."),
    onError: handleProfileMutationError,
  });
  const uploading = avatarMutation.isPending || coverMutation.isPending;

  const chooseImage = (kind, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCropImage({ kind, url: URL.createObjectURL(file) });
  };

  const closeCropper = () => {
    if (cropImage?.url) URL.revokeObjectURL(cropImage.url);
    setCropImage(null);
  };

  const uploadCroppedImage = (file) => {
    if (cropImage?.kind === "cover") coverMutation.mutate(file, { onSettled: closeCropper });
    else avatarMutation.mutate(file, { onSettled: closeCropper });
  };

  const submit = (event) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  if (profileQuery.isLoading || privacyQuery.isLoading) {
    return (
      <div className="edit-profile-page">
        <LoadingSkeleton className="h-12" count={1} />
        <LoadingSkeleton className="h-20" count={2} />
        <LoadingSkeleton className="h-14" count={8} />
      </div>
    );
  }

  if (profileQuery.isError || privacyQuery.isError) {
    return (
      <div className="edit-profile-page">
        <button className="edit-profile-back" onClick={() => navigate(backTarget)} type="button"><FiChevronLeft /></button>
        <p className="edit-profile-error">Unable to load profile settings.</p>
      </div>
    );
  }

  return (
    <form className="edit-profile-page" onSubmit={submit}>
      <header className="edit-profile-header">
        <button aria-label={backTarget === "/settings" ? "Back to settings" : "Back to profile"} className="edit-profile-back" onClick={() => navigate(backTarget)} type="button"><FiChevronLeft /></button>
        <h1>Edit Profile</h1>
      </header>

      <PhotoRow
        disabled={uploading}
        fileRef={avatarInput}
        label="Profile photo"
        onChange={(event) => chooseImage("avatar", event)}
        src={profilePhoto}
        subtitle="Square works best"
      />
      <PhotoRow
          cover
          disabled={uploading}
          fileRef={coverInput}
          label="Cover photo"
          onChange={(event) => chooseImage("cover", event)}
          src={coverPhoto}
      />

      {cropImage ? <ProfileImageCropper kind={cropImage.kind} onCancel={closeCropper} onSave={uploadCroppedImage} saving={uploading} source={cropImage.url} /> : null}

      {message ? <p className="edit-profile-success">{message}</p> : null}
      {error ? <p className="edit-profile-error">{error}</p> : null}

      <section className="edit-profile-fields">
        <Field label="First name" name="firstName" onChange={updateField} value={form.firstName} />
        <Field label="Last name" name="lastName" onChange={updateField} value={form.lastName} />
        <Field className="edit-profile-field-wide" disabled label="Username" name="username" onChange={updateField} value={`@${form.username}`} />
        <p className="edit-profile-help edit-profile-field-wide">Your profile link is created automatically from your username - atseen.com/{form.username}</p>
        <Field label="Location" name="locationText" onChange={updateField} value={form.locationText} />
        <Field label="Languages" name="languagesText" onChange={updateField} value={form.languagesText} />
        <Field className="edit-profile-field-wide" label="Website" name="website" onChange={updateField} placeholder="One external link - site, Instagram, YouTube..." value={form.website} />
      </section>

      <section className="edit-profile-fields">
        <h2 className="edit-profile-field-wide">Contact Options</h2>
        <Field className="edit-profile-field-wide" disabled label="Email" name="email" onChange={updateField} value={form.email} />
        <Field label="Phone number" name="phoneNumber" onChange={updateField} value={form.phoneNumber} />
        <Field label="WhatsApp" name="whatsapp" onChange={updateField} value={form.whatsapp} />
      </section>

      <section className="edit-profile-settings-list">
        <h2>Settings</h2>
        <button className="edit-profile-settings-row" onClick={() => setStatusOpen(true)} type="button">
          <span>
            <b>Status</b>
            <small>{activeStatus?.label || "At seen"}</small>
          </span>
          <FiChevronRight />
        </button>
        <SettingsRow subtitle={directSummary} title="Direct Access settings" to="/messages?tab=direct" />
        <button className="edit-profile-settings-row" onClick={() => setGiftSettingsOpen(true)} type="button">
          <span><b>Gift settings</b><small>{giftSummary}</small></span><FiChevronRight />
        </button>
        <button className="edit-profile-settings-row" onClick={() => setNotificationsOpen(true)} type="button">
          <span><b>Notifications</b><small>{notificationSummary}</small></span><FiChevronRight />
        </button>
      </section>

      {role === "creator" ? <section className="edit-profile-privacy">
        <h2>Privacy</h2>
        <Segmented label="Who can see your saved places?" onChange={setSavedVisibility} value={segmentedFromVisibility(form.profileVisibility)} />
        <Segmented label="Who can see your orbit?" onChange={setOrbitVisibility} value={form.orbitVisible ? "everyone" : "only_me"} />
        <p>Your orbit only ever shows public ties - follows and open dream support. Messages and private signals never appear to others.</p>
      </section> : null}

      <button className="edit-profile-save" disabled={saveMutation.isPending || uploading} type="submit">
        {saveMutation.isPending ? "Saving..." : "Save"}
      </button>

      <StatusPicker
        activeStatus={activeStatus}
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        onStatusChange={(label) => {
          statusContext?.setStatus?.(label || "");
          setStatusOpen(false);
          queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
          queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
        }}
      />
      <NotificationSheet isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <GiftSettingsComingSoon isOpen={giftSettingsOpen} onClose={() => setGiftSettingsOpen(false)} />
    </form>
  );
}

export default ProfileSettingsPage;

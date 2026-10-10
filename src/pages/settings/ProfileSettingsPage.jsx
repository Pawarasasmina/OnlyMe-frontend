import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheckCircle, FiChevronLeft, FiChevronRight } from "react-icons/fi";
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
  savedPlacesVisibility: "everyone",
  showMemberBadgeOnComments: true,
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
    savedPlacesVisibility: privacyData?.privacySettings?.savedPlacesVisibility || "everyone",
    showMemberBadgeOnComments: privacyData?.privacySettings?.showMemberBadgeOnComments !== false,
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

function Field({ className = "", disabled = false, label, name, onChange, placeholder = "", value }) {
  return (
    <label className={`edit-profile-field ${className}`}>
      <span>{label}</span>
      <input disabled={disabled} name={name} onChange={onChange} placeholder={placeholder} value={value || ""} />
    </label>
  );
}

function BioField({ onChange, value }) {
  return <label className="edit-profile-field edit-profile-field-wide"><span>Bio</span><textarea maxLength={120} name="bio" onChange={onChange} value={value || ""} /><small className="edit-profile-help">Max 120 — shown right under your name</small></label>;
}

function PhotoRow({ disabled, fileRef, label, onChange, src, subtitle }) {
  return (
    <div className="edit-profile-photo-row">
      <FanAvatar name={label} size="h-[56px] w-[56px]" src={resolveMediaUrl(src)} />
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

function Segmented({ label, onChange, options = [
    ["everyone", "Everyone"],
    ["followers", "Followers"],
    ["only_me", "Only me"],
  ], value }) {
  return (
    <div className="edit-profile-privacy-control">
      <p>{label}</p>
      <div style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([option, text]) => (
          <button className={value === option ? "is-active" : ""} key={option} onClick={() => onChange(option)} type="button">{text}</button>
        ))}
      </div>
    </div>
  );
}

const notificationRows = [
  ["reactions", "Support on your notes"],
  ["comments", "Comments & replies"],
  ["followers", "New followers"],
  ["messages", "Messages"],
  ["directAccess", "Direct Access requests"],
  ["gifts", "Gifts received"],
  ["email", "Weekly digest"],
];

function NotificationSheet({ anchorRef, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [anchorBounds, setAnchorBounds] = useState(null);
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
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "notifications"] });
      setError("Unable to save notification settings. Please try again.");
    },
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

  useEffect(() => {
    if (!isOpen) return undefined;
    const syncBounds = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      setAnchorBounds(rect ? { left: rect.left, width: rect.width } : null);
    };
    syncBounds();
    window.addEventListener("resize", syncBounds);
    return () => window.removeEventListener("resize", syncBounds);
  }, [anchorRef, isOpen]);

  if (!isOpen) return null;

  const toggle = (key) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setError("");
    mutation.mutate(next);
  };

  return <div aria-labelledby="profile-notifications-title" aria-modal="true" className="profile-notification-layer settings-notification-layer" role="dialog" style={anchorBounds ? { "--settings-notification-left": `${anchorBounds.left}px`, "--settings-notification-width": `${anchorBounds.width}px` } : undefined}>
    <button aria-label="Close notifications" className="profile-notification-dim" onClick={onClose} type="button" />
    <section className="profile-notification-sheet settings-notification-sheet edit-profile-notification-sheet">
      <span aria-hidden="true" className="profile-notification-grab" />
      <h2 id="profile-notifications-title">Notifications</h2>
      {query.isLoading ? <LoadingSkeleton className="mt-5 h-56" /> : <div className="profile-notification-list">
        {notificationRows.map(([key, title]) => <button aria-checked={preferences[key] !== false} disabled={mutation.isPending} key={key} onClick={() => toggle(key)} role="switch" type="button"><span><b>{title}</b></span><i aria-hidden="true" className={preferences[key] !== false ? "is-on" : ""}><em /></i></button>)}
      </div>}
      {query.isError ? <p className="profile-notification-error">Unable to load notification settings.</p> : null}
      {error ? <p className="profile-notification-error">{error}</p> : null}
    </section>
  </div>;
}

function GiftSettingsSheet({ anchorRef, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [anchorBounds, setAnchorBounds] = useState(null);
  const query = useQuery({ queryKey: ["settings", "gifts"], queryFn: () => profileService.getGiftSettings().then((response) => response.data.data), enabled: isOpen });
  const mutation = useMutation({
    mutationFn: (enabledGiftIds) => profileService.updateGiftSettings(enabledGiftIds),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "gifts"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["messages", "gifts"] });
      queryClient.invalidateQueries({ queryKey: ["dream"] });
      setError("");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "gifts"] });
      setError("Unable to update gifts. Please try again.");
    },
  });
  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const syncBounds = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      setAnchorBounds(rect ? { left: rect.left, width: rect.width } : null);
    };
    syncBounds();
    window.addEventListener("resize", syncBounds);
    return () => window.removeEventListener("resize", syncBounds);
  }, [anchorRef, isOpen]);

  if (!isOpen) return null;

  const toggleGroup = (group) => {
    const gifts = query.data?.gifts || [];
    const groupIds = new Set(group.gifts.map((gift) => gift.id));
    const enabled = !group.gifts.every((gift) => gift.enabled);
    const nextGifts = gifts.map((gift) => groupIds.has(gift.id) ? { ...gift, enabled } : gift);
    const enabledGiftIds = nextGifts.filter((gift) => gift.enabled).map((gift) => gift.id);
    queryClient.setQueryData(["settings", "gifts"], { gifts: nextGifts });
    mutation.mutate(enabledGiftIds);
  };
  const toggle = (gift) => toggleGroup({ gifts: [gift] });

  return (
    <div aria-labelledby="gift-settings-title" aria-modal="true" className="profile-notification-layer settings-notification-layer" role="dialog" style={anchorBounds ? { "--settings-notification-left": `${anchorBounds.left}px`, "--settings-notification-width": `${anchorBounds.width}px` } : undefined}>
      <button aria-label="Close gift settings" className="profile-notification-dim" disabled={mutation.isPending} onClick={onClose} type="button" />
      <section className="profile-notification-sheet settings-notification-sheet gift-settings-sheet">
        <span aria-hidden="true" className="profile-notification-grab" />
        <h2 className="text-[18px] font-black text-white" id="gift-settings-title">Gifts</h2>
        <p className="mt-1 text-[11px] text-white/45">What fans can send you — coins go to your balance</p>
        {query.isLoading ? <LoadingSkeleton className="mt-5 h-56" /> : query.isError ? <p className="py-10 text-center text-sm text-atseen-danger">Unable to load gift settings.</p> : <div className="mt-5 divide-y divide-white/[0.08]">{(query.data?.gifts || []).map((gift) => <button aria-pressed={gift.enabled} className="flex w-full items-center gap-4 py-3.5 text-left disabled:opacity-60" disabled={mutation.isPending} key={gift.id} onClick={() => toggle(gift)} type="button"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.04]"><img alt="" className="h-10 w-10 object-contain" src={gift.imageUrl} style={{ transform: `translate(${gift.imagePositionX || 0}%, ${gift.imagePositionY || 0}%) scale(${(gift.displayScale || 100) / 100})` }} /></span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-white">{gift.name}</b><small className="mt-1 block text-xs text-atseen-muted">✦{Number(gift.stars).toLocaleString()}</small></span><i aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition ${gift.enabled ? "bg-[#9ccbff]" : "bg-white/15"}`}><em className={`absolute top-1 h-5 w-5 rounded-full bg-[#111722] shadow transition ${gift.enabled ? "left-6" : "left-1"}`} /></i></button>)}</div>}
        {error ? <p className="mt-3 text-center text-xs text-atseen-danger">{error}</p> : null}
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
  const settingsMainRef = useRef(null);
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
  const giftSettingsQuery = useQuery({
    queryKey: ["settings", "gifts"],
    queryFn: () => profileService.getGiftSettings().then((response) => response.data.data),
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

  const directSummary = useMemo(() => {
    if (role !== "creator") return "Available in Messages";
    const parts = [];
    if (profile.directAccessEnabled !== false) parts.push("On");
    if (profile.directAccessPriceStars) parts.push(`messages ${profile.directAccessPriceStars}`);
    if (profile.directCallEnabled) parts.push(`calls ${profile.directCallPriceStars || 500} / ${profile.directCallDurationMinutes || 5} min`);
    return parts.length ? parts.join(" - ") : "Off";
  }, [profile.directAccessEnabled, profile.directAccessPriceStars, profile.directCallDurationMinutes, profile.directCallEnabled, profile.directCallPriceStars, role]);

  const giftSummary = useMemo(() => {
    const enabled = (giftSettingsQuery.data?.gifts || []).filter((gift) => gift.enabled);
    if (!giftSettingsQuery.data) return "Choose accepted gifts";
    if (!enabled.length) return "All gifts off";
    if (enabled.length === giftSettingsQuery.data.gifts.length) return "All gifts on";
    return enabled.slice(0, 3).map((gift) => gift.name).join(" - ") + (enabled.length > 3 ? ` +${enabled.length - 3}` : "");
  }, [giftSettingsQuery.data]);
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
    setForm((current) => ({ ...current, savedPlacesVisibility: value }));
  };

  const setMemberBadgeVisibility = (value) => {
    setDirty(true);
    setForm((current) => ({ ...current, showMemberBadgeOnComments: value === "everyone" }));
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
            savedPlacesVisibility: form.savedPlacesVisibility,
            showMemberBadgeOnComments: form.showMemberBadgeOnComments,
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
  const uploading = avatarMutation.isPending;

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
    avatarMutation.mutate(file, { onSettled: closeCropper });
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
    <form className="edit-profile-page" onSubmit={submit} ref={settingsMainRef}>
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
      {cropImage ? <ProfileImageCropper kind={cropImage.kind} onCancel={closeCropper} onSave={uploadCroppedImage} saving={uploading} source={cropImage.url} /> : null}

      {message ? <p className="edit-profile-success">{message}</p> : null}
      {error ? <p className="edit-profile-error">{error}</p> : null}

      <section className="edit-profile-fields">
        <Field label="First name" name="firstName" onChange={updateField} value={form.firstName} />
        <Field label="Last name" name="lastName" onChange={updateField} value={form.lastName} />
        <Field className="edit-profile-field-wide" disabled label="Username" name="username" onChange={updateField} value={`@${form.username}`} />
        <p className="edit-profile-help edit-profile-field-wide">Your profile link is created automatically from your username - atseen.com/{form.username}</p>
        <BioField onChange={updateField} value={form.bio} />
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
        <SettingsRow subtitle={directSummary} title="Direct Access settings" to="/settings/direct-access" />
        <button className="edit-profile-settings-row" onClick={() => setGiftSettingsOpen(true)} type="button">
          <span><b>Gift settings</b><small>{giftSummary}</small></span><FiChevronRight />
        </button>
        <button className="edit-profile-settings-row" onClick={() => setNotificationsOpen(true)} type="button">
          <span><b>Notifications</b><small>{notificationSummary}</small></span><FiChevronRight />
        </button>
      </section>

      <section className="edit-profile-privacy">
        <h2>Privacy</h2>
        <Segmented label="Who can see your saved places?" onChange={setSavedVisibility} value={form.savedPlacesVisibility} />
        <Segmented label="Show your 🍂 member badge on comments?" onChange={setMemberBadgeVisibility} options={[["everyone", "Everyone"], ["only_me", "Only me"]]} value={form.showMemberBadgeOnComments ? "everyone" : "only_me"} />
        <p>Your member number is always private — only you see it</p>
      </section>

      <section className="edit-profile-verification">
        <h2>Verification</h2>
        <Link to={role === "creator" ? "/creator/verified" : "/settings"}><FiCheckCircle /><span><b>{account.isVerified ? "Verified ✓" : "Get verified"}</b><small>{account.isVerified ? "the badge shows next to your name" : "Learn about profile verification"}</small></span><FiChevronRight /></Link>
      </section>

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
        profile={{ avatar: account.avatar, displayName: account.name, username: account.username }}
      />
      <NotificationSheet anchorRef={settingsMainRef} isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <GiftSettingsSheet anchorRef={settingsMainRef} isOpen={giftSettingsOpen} onClose={() => setGiftSettingsOpen(false)} />
    </form>
  );
}

export default ProfileSettingsPage;

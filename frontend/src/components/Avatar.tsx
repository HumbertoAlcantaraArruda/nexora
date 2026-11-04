import { useState } from "react";
import type { User } from "../services/authService";
import { initials } from "../initials";

interface AvatarProps {
  user: Pick<User, "name" | "avatar_url">;
  size?: number;
}

// Foto de perfil do usuário; sem foto (ou se ela não carregar), as iniciais.
export default function Avatar({ user, size = 32 }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = user.avatar_url;
  const showPhoto = url !== null && url !== failedUrl;

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {showPhoto ? (
        <img src={url} alt="" onError={() => setFailedUrl(url)} />
      ) : (
        initials(user.name) || "?"
      )}
    </span>
  );
}

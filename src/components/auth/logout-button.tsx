import { logoutAction } from "@/modules/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className="secondary-button" type="submit">Sign out</button>
    </form>
  );
}

/**
 * Returns a payload for SUCCESS_ALERT_REDIRECT used by the frontend (http.js)
 * to show SweetAlert and then redirect.
 * Use with: res.status(201).json(alertRedirect(title, icon, text, redirectPath))
 */
export function alertRedirect(
  title: string,
  icon: 'success' | 'error' | 'warning' | 'info',
  text: string,
  redirectPath: string,
) {
  return {
    status: 'SUCCESS_ALERT_REDIRECT',
    alertTitle: title,
    alertIcon: icon,
    alertText: text,
    redirect: redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`,
  };
}

import type { Profile } from '../db/profiles';
import type { Credential } from '../db/credentials';
import { calculateStatus } from '../domain/status';

const STATUS_CSS: Record<string, string> = {
  active: '#16a34a',
  'expiring-soon': '#d97706',
  expiring: '#ea580c',
  expired: '#dc2626',
  'no-expiration': '#6b7280',
};

function labelRow(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `<tr><td class="label">${label}</td><td>${value}</td></tr>`;
}

export function buildCredentialReportHtml(profile: Profile, credentials: Credential[]): string {
  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const cards = credentials.map((c) => {
    const status = calculateStatus(c.expiration_date);
    const color = STATUS_CSS[status] ?? '#6b7280';
    const statusLabel = status.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return `
      <div class="card">
        <div class="card-header">
          <span class="credential-name">${c.name}</span>
          <span class="status-badge" style="background:${color}">${statusLabel}</span>
        </div>
        <table>
          ${labelRow('Issuing Body', c.issuing_body)}
          ${labelRow('Credential #', c.credential_number)}
          ${labelRow('Issue Date', c.issue_date)}
          ${labelRow('Expiration Date', c.expiration_date)}
          ${labelRow('Renewal URL', c.renewal_url)}
          ${labelRow('Notes', c.notes)}
        </table>
      </div>`;
  }).join('');

  const emptyMsg = credentials.length === 0
    ? '<p class="empty">No credentials on file.</p>'
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Helvetica, sans-serif; margin: 0; padding: 24px; color: #111; }
  .header { margin-bottom: 24px; border-bottom: 2px solid #3B82F6; padding-bottom: 12px; }
  .profile-name { font-size: 24px; font-weight: bold; }
  .profession { font-size: 14px; color: #6b7280; margin-top: 2px; }
  .generated { font-size: 12px; color: #9ca3af; margin-top: 4px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .credential-name { font-size: 16px; font-weight: 600; }
  .status-badge { font-size: 11px; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 4px 0; vertical-align: top; }
  td.label { color: #6b7280; width: 130px; }
  .empty { color: #9ca3af; text-align: center; padding: 32px; }
</style>
</head>
<body>
  <div class="header">
    <div class="profile-name">${profile.name}</div>
    ${profile.profession ? `<div class="profession">${profile.profession}</div>` : ''}
    <div class="generated">Generated ${generated}</div>
  </div>
  ${emptyMsg}
  ${cards}
</body>
</html>`;
}

export async function shareCredentialReport(profile: Profile, credentials: Credential[]): Promise<void> {
  // @ts-ignore
  const { printToFileAsync } = await import('expo-print');
  // @ts-ignore
  const { shareAsync } = await import('expo-sharing');
  const html = buildCredentialReportHtml(profile, credentials);
  const { uri } = await printToFileAsync({ html });
  await shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Credential Report',
    UTI: 'com.adobe.pdf',
  });
}

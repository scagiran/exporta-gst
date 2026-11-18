import type { Lang } from '../lang';
import { landing, LandingMessages } from './landing';
import { auth, AuthMessages } from './auth';
import { appShell, AppShellMessages } from './appShell';
import { appRecords, AppRecordsMessages } from './appRecords';
import { appShipments, AppShipmentsMessages } from './appShipments';
import { appSettings, AppSettingsMessages } from './appSettings';
import { appImport, AppImportMessages } from './appImport';
import { docs, DocsMessages } from './docs';
import { appQuality, AppQualityMessages } from './appQuality';

export type Messages = LandingMessages &
  AppShellMessages &
  AppRecordsMessages &
  AppShipmentsMessages &
  AppSettingsMessages &
  AppImportMessages &
  DocsMessages &
  AppQualityMessages & {
    auth: AuthMessages;
  };

const build = (lang: Lang): Messages => ({
  ...landing[lang],
  ...appShell[lang],
  ...appRecords[lang],
  ...appShipments[lang],
  ...appSettings[lang],
  ...appImport[lang],
  ...docs[lang],
  ...appQuality[lang],
  auth: auth[lang],
});

export const messages: Record<Lang, Messages> = { tr: build('tr'), en: build('en'), fr: build('fr') };

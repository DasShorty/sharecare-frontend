import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from '@core/app.config';
import { App } from '@core/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

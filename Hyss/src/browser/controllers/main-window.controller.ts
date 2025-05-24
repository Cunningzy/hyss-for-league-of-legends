import { app as electronApp, ipcMain, BrowserWindow } from 'electron';
import { GameEventsService } from '../services/gep.service';
import path from 'path';
import { DemoOSRWindowController } from './demo-osr-window.controller';
import { OverlayService } from '../services/overlay.service';
import { overwolf } from '@overwolf/ow-electron';
import { OverlayHotkeysService } from '../services/overlay-hotkeys.service';
import { ExclusiveHotKeyMode, OverlayInputService } from '../services/overlay-input.service';

const owElectronApp = electronApp as overwolf.OverwolfApp;

export class MainWindowController {
  private browserWindow: BrowserWindow = null;

  constructor(
    private readonly gepService: GameEventsService,
    private readonly overlayService: OverlayService,
    private readonly createDemoOsrWinController: () => DemoOSRWindowController,
    private readonly overlayHotkeysService: OverlayHotkeysService,
    private readonly overlayInputService: OverlayInputService
  ) {
    this.registerToIpc();

    gepService.on('log', this.printLogMessage.bind(this));
    overlayService.on('log', this.printLogMessage.bind(this));
    overlayHotkeysService.on('log', this.printLogMessage.bind(this));

    owElectronApp.overwolf.packages.on('crashed', (e, ...args) => {
      this.printLogMessage('package crashed', ...args);
      e.preventDefault();
    });

    owElectronApp.overwolf.packages.on('failed-to-initialize', this.logPackageManagerErrors.bind(this));

    
    gepService.registerGames([5426]);
    gepService.on('ready', () => {
      gepService.setRequiredFeaturesForLol();
    });
  }

  public printLogMessage(message: string, ...args: any[]) {
    if (this.browserWindow?.isDestroyed() ?? true) {
      return;
    }
    this.browserWindow?.webContents?.send('console-message', message, ...args);
  }

  private logPackageManagerErrors(e, packageName, ...args: any[]) {
    this.printLogMessage('Overwolf Package Manager error!', packageName, ...args);
  }

  public createAndShow(showDevTools: boolean) {
    this.browserWindow = new BrowserWindow({
      width: 800,
      height: 900,
      x: 500, // 
      y: 500, // 
      show: false, //Alex - hide 

      modal: false, // 
      frame: false, // can be standart os windiows
      transparent: true, //

      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        devTools: showDevTools,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
    });

    this.browserWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  private registerToIpc() {
    ipcMain.handle('createOSR', async () => await this.createOSRDemoWindow());

   
    ipcMain.handle('gep-set-required-feature', async () => {
      return await this.gepService.setRequiredFeaturesForLol();
    });


    ipcMain.handle('gep-getInfo', async () => {
      return { message: 'getInfo not implemented yet' };
    });

    ipcMain.handle('toggleOSRVisibility', async () => {
      this.overlayService?.overlayApi?.getAllWindows().forEach((e) => {
        e.window.show();
      });
    });

    ipcMain.handle('updateHotkey', async () => {
      this.overlayHotkeysService?.updateHotkey();
    });

    ipcMain.handle('updateExclusiveOptions', async (sender, options) => {
      this.overlayInputService?.updateExclusiveModeOptions(options);
    });

    ipcMain.handle('EXCLUSIVE_TYPE', async (sender, type) => {
      if (!this.overlayInputService) {
        return;
      }

      if (type === 'customWindow') {
        this.overlayInputService.exclusiveModeAsWindow = true;
      } else {
        this.overlayInputService.exclusiveModeAsWindow = false;
      }
    });

    ipcMain.handle('EXCLUSIVE_BEHAVIOR', async (sender, behavior) => {
      if (!this.overlayInputService) {
        return;
      }

      if (behavior === 'toggle') {
        this.overlayInputService.mode = ExclusiveHotKeyMode.Toggle;
      } else {
        this.overlayInputService.mode = ExclusiveHotKeyMode.AutoRelease;
      }
    });
  }

  private async createOSRDemoWindow(): Promise<void> {
    const controller = this.createDemoOsrWinController();
    const showDevTools = true;
    await controller.createAndShow(showDevTools);

    controller.overlayBrowserWindow.window.on('closed', () => {
      this.printLogMessage('osr window closed');
    });
  }
}
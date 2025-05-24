import path from "path";
import { OverlayService } from "../services/overlay.service";
import { OverlayBrowserWindow, OverlayWindowOptions, PassthroughType, ZOrderType } from "@overwolf/ow-electron-packages-types";
import { app as electronApp, BrowserWindow , screen} from 'electron';
import { wsService } from "./ws-server.service";



export class DemoOSRWindowController {
  private overlayWindow: OverlayBrowserWindow | null = null;

  public get overlayBrowserWindow(): OverlayBrowserWindow | null {
    return this.overlayWindow;
  }

  constructor(private readonly overlayService: OverlayService) { }

  public async showTemporary(text: string, time: number = 5000) {
    await this.createAndShow(false);
    if (this.overlayWindow) {

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh; 
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      user-select: none;
      
    }
    .notification-container {
      position: relative;
    }
    .dialog {
      background: rgba(5, 0, 80, 0.781);
      padding: 20px;
      border-radius: 35px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      max-width: 100%;
      font-size: 10px;
    
      animation: moveUpDown 0.8s infinite alternate ease-in-out;
    }
    @keyframes moveUpDown {
      0% {
        transform: translateY(0);
      }
      100% {
        transform: translateY(-30px); 
      }
    }
    h2 {
      color: white;
      margin: 0 0 15px;
      font-size: 12px;
      border-radius: 15px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      word-wrap: break-word;
    }
    button {
      background-color:rgb(33, 75, 34);
      color: black;
      border: none;
      padding: 10px 30px;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      font-size: 14px;
      border-radius: 15px;
      cursor: pointer;
     
      transition: background-color 0.1s ease;
    }
    button:hover {
      background-color: #45a049;
    }
  </style>
</head>
<body>
  <div class="notification-container">
    <div class="dialog" id="draggableDialog">
      <h2>Time to open the HYSS browser extension and stretch!</h2>
      <button id="closeButton">OK</button>
    </div>
  </div>

  <script>
    const dialog = document.getElementById('draggableDialog');
    const closeButton = document.getElementById('closeButton');
    const notificationContainer = document.querySelector('.notification-container');

    closeButton.addEventListener('click', () => {
     
      dialog.style.animation = 'none';
     
      dialog.style.opacity = 0;
      dialog.style.transform = 'translateY(-20px)'; 
      dialog.style.transition = 'opacity 0.1s ease-in-out, transform 0.1s ease-in-out';

      setTimeout(() => {
        notificationContainer.remove();
      }, 1000);
    });
  </script>
</body>
</html>
      `;
      await this.overlayWindow.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      setTimeout(() => {
        this.closeWindow();
      }, time);
    }
  }

  public async createAndShow(showDevTools: boolean) {
    if (this.overlayWindow) {
      this.overlayWindow.window.show();
      return;
    }

    const options: OverlayWindowOptions = {
      name: 'osrWindow-' + Math.floor(Math.random() * 1000),
      height: 500,
      width: 600,
      show: true,
      modal: false, // 
      transparent: true,
      
      resizable: false,
      webPreferences: {
        devTools: showDevTools,
        nodeIntegration: true,
        contextIsolation: false,
      },
    };

    const activeGame = this.overlayService.overlayApi.getActiveGameInfo();
    const gameWindowInfo = activeGame?.gameWindowInfo;
    // const screenWidth = gameWindowInfo?.size.width || 500;
    const sizeWh = screen.getPrimaryDisplay()
    const positionScreenCentre = sizeWh.workAreaSize.width / 2

    options.x = positionScreenCentre - 300
    options.y = 1

    this.overlayWindow = await this.overlayService.createNewOsrWindow(options);
    this.registerToWindowEvents();
    this.overlayWindow.window.show();
  }

  private registerToWindowEvents() {
    const browserWindow = this.overlayWindow?.window;
    if (browserWindow) {
      browserWindow.on('closed', () => {
        this.overlayWindow = null;
        console.log('osr window closed');
      });
    }
  }


  public closeWindow() {
    if (this.overlayWindow) {
      this.overlayWindow.window.close();
      this.overlayWindow = null;
    }
  }

  private randomInteger(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
// =============================================



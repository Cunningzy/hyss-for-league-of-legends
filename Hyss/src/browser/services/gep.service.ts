import { app as electronApp, BrowserWindow, screen } from 'electron';
import { overwolf } from '@overwolf/ow-electron';
import EventEmitter from 'events';
import { OverlayService } from './overlay.service';
import { DemoOSRWindowController } from './dialog';
import { messageBoxGame } from './dialogOutGame';
import { OverlayBrowserWindow, OverlayWindowOptions, PassthroughType, ZOrderType } from "@overwolf/ow-electron-packages-types";
import { wsService } from "./ws-server.service";


const app = electronApp as overwolf.OverwolfApp;

let messageOut_Relax: string = "Need to relax let"
let messageOut_Game_Detected: string = "Game Detected let"
let message_Inside_Offer: string = "Time to open the HYSS browser extension and stretch!"

interface GepEvent {
    feature: string;
    key: string;
    value: any;
}

interface SetFeaturesResult {
    success: boolean;
    features?: string[];
    error?: string;
}

export class GameEventsService extends EventEmitter {
    private gepApi: overwolf.packages.OverwolfGameEventPackage | null = null;
    private activeGame = 0;
    private gepGamesId: number[] = [];
    private windowController: DemoOSRWindowController;

    constructor() {
        super();
        const overlayService = new OverlayService();
        this.windowController = new DemoOSRWindowController(overlayService);
        this.registerOverwolfPackageManager();
    }

    public registerGames(gepGamesId: number[]) {
        this.emit('log', `Registering to game events for:`, gepGamesId);
        console.log(`Registering to game events for:`, gepGamesId)
        // this.gepGamesId = gepGamesId;
        // this.windowController.showTemporary("Think your healt 3", 30000)
        //   .then(() => this.emit('log', 'Overlay window shown and will auto-close'))
        //   .catch((error) => this.emit('log', 'Failed to show overlay:', error));
    }

    public async setRequiredFeaturesForLol() {
        if (!this.gepApi) {
            this.emit('log', 'GEP API not ready');
            return false;
        }

        const gameId = 5426;
        const features = ['match_info', 'live_client_data', 'game_info'];
        this.emit('log', `Setting required features for LoL (${gameId}):`, features);

        try {
            const result = (await this.gepApi.setRequiredFeatures(gameId, features)) as unknown;
            const typedResult = result as SetFeaturesResult;

            if (typedResult.success) {
                this.emit('log', `Successfully set features for LoL:`, typedResult.features);
                messageBoxGame("Successfully set features for LoL", 30000)
                return true;
            } else {
                this.emit('log', `Failed to set features for LoL:`, typedResult.error);
                setTimeout(() => this.setRequiredFeaturesForLol(), 30000);
                return false;
            }
        } catch (error) {
            this.emit('log', `Error setting features for LoL:`, error);
            return false;
        }
    }

    private registerOverwolfPackageManager() {
        app.overwolf.packages.on('ready', (e, packageName, version) => {
            if (packageName !== 'gep') {
                return;
            }
            this.emit('log', `GEP package is ready: ${version}`);
            this.onGameEventsPackageReady();
            this.emit('ready');
            this.windowController.showTemporary("Think your healt 2", 30000)
                .then(() => this.emit('log', 'Overlay window shown and will auto-close'))
                .catch((error) => this.emit('log', 'Failed to show overlay:', error));
        });
    }

    private async onGameEventsPackageReady() {
        this.gepApi = app.overwolf.packages.gep;
        this.gepApi.removeAllListeners();
        // overwolf.packages.gep.onGameLaunched.addListener((launchData) => {
        //     if (!launchData || !launchData.gameInfo) {
        //         return;
        //     }
        //
        //     if (launchData.gameInfo.classId === 5426) {
        //         console.log('🟢 League of Legends has just launched!');
        //     }
        // })
        this.gepApi.on('game-detected', (e, gameId, name, gameInfo) => {
            console.log('game-detected', gameId, name, gameInfo);

            // Game open
            if (gameId === 5426) {
                wsService.sendMessage({ type: 'notify', message: message_Inside_Offer });
            }
            //   this.emit('log', messageOut_Game_Detected, gameId, name, gameInfo.pid);
            //   const sizeWh = screen.getPrimaryDisplay()
            //   const positionScreenCentre = sizeWh.workAreaSize.width / 2
            //   const xProps = positionScreenCentre
            //   const yProps = 1;
            //   messageBoxGame(messageOut_Game_Detected, 5000, xProps, yProps);

            //   this.windowController.showTemporary('Need to relax 2', 500)
            //     .then(() => this.emit('log', 'Overlay window shown and will auto-close'))
            //     .catch((error) => this.emit('log', 'Failed to show overlay:', error));
            //   return;
            // }

            // session start
            if (gameInfo.isElevated) {
                this.emit('log', 'GEP: Game is elevated, cannot connect:', gameId, name);
                return;
            }
            this.emit('log', 'GEP: Registered game-detected', gameId, name, gameInfo.name);
            const time: number = 40000
            this.windowController.showTemporary(message_Inside_Offer, time)
                .then(() => this.emit('log', 'Overlay window shown and will auto-close'))
                .catch((error) => this.emit('log', 'Failed to show overlay:', error));
            this.windowController.showTemporary(message_Inside_Offer, time)
                .then(() => this.emit('log', 'Overlay window shown and will auto-close'))
                .catch((error) => this.emit('log', 'Failed to show overlay:', error));
            e.enable();
            this.activeGame = gameId;
            this.setRequiredFeaturesForLol();
        });


        // --- session and
        // this.gepApi.on('game-exit', (e, gameId, processName, pid) => {
        //     wsService.sendMessage({ type: 'notify', message: messageOut_Relax });
        // })
        //   this.emit('log', 'GEP: Game exit', gameId, processName, pid);
        //   this.activeGame = 0;
        //   const numberOfCalls = 10;
        //   for (let i = 0; i < numberOfCalls; i++) {
        //     const xProps = Math.floor(Math.random() * 1920);
        //     const yProps = Math.floor(Math.random() * 1080);
        //     setTimeout(() => {
        //       messageBoxGame(messageOut_Relax, 1000, xProps, yProps)
        //     }, i * 1200);
        //   }
        // this.windowController.showTemporary('Need to relax', 30000)
        //   .then(() => this.emit('log', 'Overlay window shown and will auto-close'))
        //   .catch((error) => this.emit('log', 'Failed to show overlay:', error));
        // ----
        // });


        // Session Ivent
        // //@ts-ignore
        // this.gepApi.on('new-game-event', (e: GepEvent, gameId: number, ...args: any[]) => {
        //   if (gameId === 5426) {
        //     this.emit('log', 'LoL Event:', {
        //       feature: e.feature,
        //       key: e.key,
        //       value: e.value,
        //       args,
        //     });
        //     let eventMessage = args[0].value;
        //     this.windowController.showTemporary(`Game let : ${eventMessage}`, 5000)
        //       .then(() => this.emit('log', 'Overlay window shown and will auto-close'))
        //       .catch((error) => this.emit('log', 'Failed to show overlay:', error));
        //   }
        // });


        this.gepApi.on('error', (e, gameId, error, ...args) => {
            this.emit('log', 'GEP Error:', gameId, error, ...args);
            this.activeGame = 0;
        });
    }
}

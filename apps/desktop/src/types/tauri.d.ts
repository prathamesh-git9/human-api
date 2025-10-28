// Tauri API type declarations
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (command: string, args?: any) => Promise<any>;
      tauri: {
        invoke: (command: string, args?: any) => Promise<any>;
      };
    };
  }
}

export {};

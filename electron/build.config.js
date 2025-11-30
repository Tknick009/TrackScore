/**
 * electron-builder configuration for Track & Field Scoreboard
 */
module.exports = {
  appId: 'com.stadium.scoreboard',
  productName: 'Track & Field Scoreboard',
  copyright: 'Copyright © 2024 Stadium Operations',
  
  directories: {
    output: 'release',
    buildResources: 'assets'
  },

  files: [
    'dist/**/*',
    'assets/**/*',
    'loading.html',
    'package.json'
  ],

  extraResources: [
    {
      from: '../dist',
      to: 'server',
      filter: ['**/*']
    },
    {
      from: '../public',
      to: 'public',
      filter: ['**/*']
    },
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*']
    }
  ],

  asar: true,
  asarUnpack: [
    '**/node_modules/sharp/**/*',
    '**/node_modules/better-sqlite3/**/*'
  ],

  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.ico',
    artifactName: '${productName}-${version}-Windows.${ext}'
  },

  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Track & Field Scoreboard',
    include: 'installer.nsh'
  },

  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.sports',
    artifactName: '${productName}-${version}-macOS-${arch}.${ext}',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'entitlements.mac.plist',
    entitlementsInherit: 'entitlements.mac.plist'
  },

  dmg: {
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 400
    }
  },

  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    icon: 'assets/icons',
    category: 'Sports',
    artifactName: '${productName}-${version}-Linux.${ext}'
  },

  publish: null,

  afterSign: async (context) => {
    console.log('Build completed for:', context.appOutDir);
  }
};

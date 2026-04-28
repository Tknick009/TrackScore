export const DEFAULT_SCENES_DATA = 
{
  "version": "1.0",
  "exportedAt": "2026-04-28T18:41:30.803Z",
  "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
  "scenes": [
    {
      "id": 2987,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P10-Running Time",
      "description": null,
      "canvasWidth": 192,
      "canvasHeight": 96,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59131,
          "sceneId": 2987,
          "name": "Box 498",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59132,
          "sceneId": 2987,
          "name": "Box 499",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 100,
          "height": 75,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "running-time"
          },
          "config": {},
          "style": {
            "fontSize": 50,
            "textAlign": "center",
            "textColor": "#ffffff",
            "backgroundColor": "rgba(0,0,0,0.5)"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 2988,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P10-Results",
      "description": null,
      "canvasWidth": 192,
      "canvasHeight": 96,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:38:14.000Z",
      "objects": [
        {
          "id": 59514,
          "sceneId": 2988,
          "name": "Box 9133",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:14.000Z"
        },
        {
          "id": 59515,
          "sceneId": 2988,
          "name": "Box 9134",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 65,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "fontSize": 20,
            "textAlign": "left",
            "textColor": "#ffffff",
            "backgroundColor": "transparent",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:14.000Z"
        },
        {
          "id": 59516,
          "sceneId": 2988,
          "name": "Box 9135",
          "objectType": "text",
          "x": 0,
          "y": 45,
          "width": 65,
          "height": 21,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "left",
            "textColor": "#c2c2c2",
            "backgroundColor": "transparent",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:14.000Z"
        },
        {
          "id": 59517,
          "sceneId": 2988,
          "name": "Box 9136",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 14,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "fontSize": 15,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "top"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:14.000Z"
        },
        {
          "id": 59518,
          "sceneId": 2988,
          "name": "Box 9137",
          "objectType": "text",
          "x": 30,
          "y": 70,
          "width": 40,
          "height": 30,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "fontSize": 17,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "top",
              "right"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b",
            "backgroundStyle": "solid"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:14.000Z"
        },
        {
          "id": 59519,
          "sceneId": 2988,
          "name": "Box 9138",
          "objectType": "logo",
          "x": 67,
          "y": 21,
          "width": 33,
          "height": 77,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "left",
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:14.000Z"
        },
        {
          "id": 59520,
          "sceneId": 2988,
          "name": "Box 9139",
          "objectType": "text",
          "x": 14,
          "y": 70,
          "width": 16,
          "height": 30,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "fontSize": 15,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "top"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:14.000Z"
        }
      ]
    },
    {
      "id": 2989,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "Big Board Lynx-Results",
      "description": null,
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:38:43.000Z",
      "objects": [
        {
          "id": 59521,
          "sceneId": 2989,
          "name": "Box 9140",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 70,
          "height": 10,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "backgroundColor": "rgba(0,0,0,0.5)"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59522,
          "sceneId": 2989,
          "name": "Box 9141",
          "objectType": "text",
          "x": 50,
          "y": 10,
          "width": 50,
          "height": 10,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "advancement-formula"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom",
              "top"
            ],
            "borderWidth": 2,
            "backgroundColor": "#2d2726",
            "borderColor": "#ffdd00"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59523,
          "sceneId": 2989,
          "name": "Box 9142",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 5,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59524,
          "sceneId": 2989,
          "name": "Box 9143",
          "objectType": "text",
          "x": 0,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 6,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59525,
          "sceneId": 2989,
          "name": "Box 9144",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59526,
          "sceneId": 2989,
          "name": "Box 9145",
          "objectType": "text",
          "x": 0,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59527,
          "sceneId": 2989,
          "name": "Box 9146",
          "objectType": "text",
          "x": 0,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59528,
          "sceneId": 2989,
          "name": "Box 9147",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59529,
          "sceneId": 2989,
          "name": "Box 9148",
          "objectType": "text",
          "x": 0,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59530,
          "sceneId": 2989,
          "name": "Box 9149",
          "objectType": "text",
          "x": 0,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 12,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59531,
          "sceneId": 2989,
          "name": "Box 9150",
          "objectType": "text",
          "x": 20,
          "y": 20,
          "width": 40,
          "height": 10,
          "zIndex": 13,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59532,
          "sceneId": 2989,
          "name": "Box 9151",
          "objectType": "text",
          "x": 60,
          "y": 20,
          "width": 20,
          "height": 10,
          "zIndex": 14,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59533,
          "sceneId": 2989,
          "name": "Box 9152",
          "objectType": "logo",
          "x": 10,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 15,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59534,
          "sceneId": 2989,
          "name": "Box 9153",
          "objectType": "text",
          "x": 80,
          "y": 20,
          "width": 20,
          "height": 10,
          "zIndex": 16,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59535,
          "sceneId": 2989,
          "name": "Box 9154",
          "objectType": "logo",
          "x": 10,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 17,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59536,
          "sceneId": 2989,
          "name": "Box 9155",
          "objectType": "text",
          "x": 20,
          "y": 30,
          "width": 40,
          "height": 10,
          "zIndex": 18,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59537,
          "sceneId": 2989,
          "name": "Box 9156",
          "objectType": "text",
          "x": 60,
          "y": 30,
          "width": 20,
          "height": 10,
          "zIndex": 19,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59538,
          "sceneId": 2989,
          "name": "Box 9157",
          "objectType": "text",
          "x": 80,
          "y": 30,
          "width": 20,
          "height": 10,
          "zIndex": 20,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59539,
          "sceneId": 2989,
          "name": "Box 9158",
          "objectType": "logo",
          "x": 10,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 21,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59540,
          "sceneId": 2989,
          "name": "Box 9159",
          "objectType": "text",
          "x": 20,
          "y": 40,
          "width": 40,
          "height": 10,
          "zIndex": 22,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59541,
          "sceneId": 2989,
          "name": "Box 9160",
          "objectType": "text",
          "x": 60,
          "y": 40,
          "width": 20,
          "height": 10,
          "zIndex": 23,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59542,
          "sceneId": 2989,
          "name": "Box 9161",
          "objectType": "text",
          "x": 80,
          "y": 40,
          "width": 20,
          "height": 10,
          "zIndex": 24,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59543,
          "sceneId": 2989,
          "name": "Box 9162",
          "objectType": "logo",
          "x": 10,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 25,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59544,
          "sceneId": 2989,
          "name": "Box 9163",
          "objectType": "text",
          "x": 20,
          "y": 50,
          "width": 40,
          "height": 10,
          "zIndex": 26,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59545,
          "sceneId": 2989,
          "name": "Box 9164",
          "objectType": "text",
          "x": 60,
          "y": 50,
          "width": 20,
          "height": 10,
          "zIndex": 27,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59546,
          "sceneId": 2989,
          "name": "Box 9165",
          "objectType": "text",
          "x": 80,
          "y": 50,
          "width": 20,
          "height": 10,
          "zIndex": 28,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59547,
          "sceneId": 2989,
          "name": "Box 9166",
          "objectType": "logo",
          "x": 10,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 29,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59548,
          "sceneId": 2989,
          "name": "Box 9167",
          "objectType": "text",
          "x": 20,
          "y": 60,
          "width": 40,
          "height": 10,
          "zIndex": 30,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59549,
          "sceneId": 2989,
          "name": "Box 9168",
          "objectType": "text",
          "x": 60,
          "y": 60,
          "width": 20,
          "height": 10,
          "zIndex": 31,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59550,
          "sceneId": 2989,
          "name": "Box 9169",
          "objectType": "text",
          "x": 80,
          "y": 60,
          "width": 20,
          "height": 10,
          "zIndex": 32,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59551,
          "sceneId": 2989,
          "name": "Box 9170",
          "objectType": "logo",
          "x": 10,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 33,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59552,
          "sceneId": 2989,
          "name": "Box 9171",
          "objectType": "text",
          "x": 20,
          "y": 70,
          "width": 40,
          "height": 10,
          "zIndex": 34,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59553,
          "sceneId": 2989,
          "name": "Box 9172",
          "objectType": "text",
          "x": 60,
          "y": 70,
          "width": 20,
          "height": 10,
          "zIndex": 35,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59554,
          "sceneId": 2989,
          "name": "Box 9173",
          "objectType": "text",
          "x": 80,
          "y": 70,
          "width": 20,
          "height": 10,
          "zIndex": 36,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59555,
          "sceneId": 2989,
          "name": "Box 9174",
          "objectType": "logo",
          "x": 10,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 37,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59556,
          "sceneId": 2989,
          "name": "Box 9175",
          "objectType": "text",
          "x": 20,
          "y": 80,
          "width": 40,
          "height": 10,
          "zIndex": 38,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59557,
          "sceneId": 2989,
          "name": "Box 9176",
          "objectType": "text",
          "x": 60,
          "y": 80,
          "width": 20,
          "height": 10,
          "zIndex": 39,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59558,
          "sceneId": 2989,
          "name": "Box 9177",
          "objectType": "text",
          "x": 80,
          "y": 80,
          "width": 20,
          "height": 10,
          "zIndex": 40,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59559,
          "sceneId": 2989,
          "name": "Box 9178",
          "objectType": "logo",
          "x": 10,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 41,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59560,
          "sceneId": 2989,
          "name": "Box 9179",
          "objectType": "text",
          "x": 20,
          "y": 90,
          "width": 40,
          "height": 10,
          "zIndex": 42,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59561,
          "sceneId": 2989,
          "name": "Box 9180",
          "objectType": "text",
          "x": 60,
          "y": 90,
          "width": 20,
          "height": 10,
          "zIndex": 43,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffdd00",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59562,
          "sceneId": 2989,
          "name": "Box 9181",
          "objectType": "text",
          "x": 80,
          "y": 90,
          "width": 20,
          "height": 10,
          "zIndex": 44,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59563,
          "sceneId": 2989,
          "name": "Box 9182",
          "objectType": "text",
          "x": 70,
          "y": 0,
          "width": 30,
          "height": 10,
          "zIndex": 44,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "wind"
          },
          "config": {
            "conditionalVisibility": "hide-when-no-wind"
          },
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "backgroundColor": "rgba(0,0,0,0.5)"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        },
        {
          "id": 59564,
          "sceneId": 2989,
          "name": "Box 9183",
          "objectType": "text",
          "x": 0,
          "y": 10,
          "width": 50,
          "height": 10,
          "zIndex": 45,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "heat-number"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom",
              "top"
            ],
            "borderWidth": 2,
            "backgroundColor": "#2e2727",
            "borderColor": "#ffdd00"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:38:43.000Z"
        }
      ]
    },
    {
      "id": 2990,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P10-Start List",
      "description": null,
      "canvasWidth": 192,
      "canvasHeight": 96,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59184,
          "sceneId": 2990,
          "name": "Box 3261",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59185,
          "sceneId": 2990,
          "name": "Box 3262",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 65,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "fontSize": 20,
            "textAlign": "left",
            "textColor": "#ffffff",
            "backgroundColor": "rgba(0,0,0,0.5)"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59186,
          "sceneId": 2990,
          "name": "Box 3263",
          "objectType": "text",
          "x": 0,
          "y": 45,
          "width": 65,
          "height": 25,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "left",
            "textColor": "#c2c2c2",
            "backgroundColor": "transparent",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59187,
          "sceneId": 2990,
          "name": "Box 3264",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 20,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "HIP:"
          },
          "style": {
            "fontSize": 16,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "top"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b",
            "backgroundStyle": "solid"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59188,
          "sceneId": 2990,
          "name": "Box 3265",
          "objectType": "logo",
          "x": 64,
          "y": 20,
          "width": 37,
          "height": 80,
          "zIndex": 5,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "left",
            "textColor": "#ffffff",
            "backgroundColor": "rgba(0,0,0,0.5)"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59189,
          "sceneId": 2990,
          "name": "Box 3266",
          "objectType": "text",
          "x": 20,
          "y": 70,
          "width": 45,
          "height": 30,
          "zIndex": 6,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane"
          },
          "config": {},
          "style": {
            "fontSize": 16,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "top",
              "right"
            ],
            "borderWidth": 2,
            "backgroundColor": "#00004b"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 2991,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "Bib Board Lynx-Starts",
      "description": null,
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:39:05.000Z",
      "objects": [
        {
          "id": 59565,
          "sceneId": 2991,
          "name": "Box 9190",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 70,
          "height": 10,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "backgroundColor": "rgba(0,0,0,0.5)"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59566,
          "sceneId": 2991,
          "name": "Box 9191",
          "objectType": "text",
          "x": 70,
          "y": 0,
          "width": 30,
          "height": 10,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "running-time"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "backgroundColor": "rgba(0,0,0,0.5)"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59567,
          "sceneId": 2991,
          "name": "Box 9192",
          "objectType": "text",
          "x": 50,
          "y": 10,
          "width": 50,
          "height": 10,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "advancement-formula"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "right",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom",
              "top"
            ],
            "borderWidth": 2,
            "backgroundColor": "#2d2726",
            "borderColor": "#ffdd00"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59568,
          "sceneId": 2991,
          "name": "Box 9193",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 5,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59569,
          "sceneId": 2991,
          "name": "Box 9194",
          "objectType": "text",
          "x": 0,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 6,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59570,
          "sceneId": 2991,
          "name": "Box 9195",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59571,
          "sceneId": 2991,
          "name": "Box 9196",
          "objectType": "text",
          "x": 0,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59572,
          "sceneId": 2991,
          "name": "Box 9197",
          "objectType": "text",
          "x": 0,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59573,
          "sceneId": 2991,
          "name": "Box 9198",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59574,
          "sceneId": 2991,
          "name": "Box 9199",
          "objectType": "text",
          "x": 0,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59575,
          "sceneId": 2991,
          "name": "Box 9200",
          "objectType": "text",
          "x": 0,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 12,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59576,
          "sceneId": 2991,
          "name": "Box 9201",
          "objectType": "text",
          "x": 20,
          "y": 20,
          "width": 40,
          "height": 10,
          "zIndex": 13,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59577,
          "sceneId": 2991,
          "name": "Box 9202",
          "objectType": "text",
          "x": 60,
          "y": 20,
          "width": 40,
          "height": 10,
          "zIndex": 14,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59578,
          "sceneId": 2991,
          "name": "Box 9203",
          "objectType": "logo",
          "x": 10,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 15,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59579,
          "sceneId": 2991,
          "name": "Box 9204",
          "objectType": "logo",
          "x": 10,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 17,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59580,
          "sceneId": 2991,
          "name": "Box 9205",
          "objectType": "text",
          "x": 20,
          "y": 30,
          "width": 40,
          "height": 10,
          "zIndex": 18,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59581,
          "sceneId": 2991,
          "name": "Box 9206",
          "objectType": "text",
          "x": 60,
          "y": 30,
          "width": 40,
          "height": 10,
          "zIndex": 19,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59582,
          "sceneId": 2991,
          "name": "Box 9207",
          "objectType": "logo",
          "x": 10,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 21,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59583,
          "sceneId": 2991,
          "name": "Box 9208",
          "objectType": "text",
          "x": 20,
          "y": 40,
          "width": 40,
          "height": 10,
          "zIndex": 22,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59584,
          "sceneId": 2991,
          "name": "Box 9209",
          "objectType": "text",
          "x": 60,
          "y": 40,
          "width": 40,
          "height": 10,
          "zIndex": 23,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59585,
          "sceneId": 2991,
          "name": "Box 9210",
          "objectType": "logo",
          "x": 10,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 25,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59586,
          "sceneId": 2991,
          "name": "Box 9211",
          "objectType": "text",
          "x": 20,
          "y": 50,
          "width": 40,
          "height": 10,
          "zIndex": 26,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59587,
          "sceneId": 2991,
          "name": "Box 9212",
          "objectType": "text",
          "x": 60,
          "y": 50,
          "width": 40,
          "height": 10,
          "zIndex": 27,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59588,
          "sceneId": 2991,
          "name": "Box 9213",
          "objectType": "logo",
          "x": 10,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 29,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59589,
          "sceneId": 2991,
          "name": "Box 9214",
          "objectType": "text",
          "x": 20,
          "y": 60,
          "width": 40,
          "height": 10,
          "zIndex": 30,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59590,
          "sceneId": 2991,
          "name": "Box 9215",
          "objectType": "text",
          "x": 60,
          "y": 60,
          "width": 40,
          "height": 10,
          "zIndex": 31,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59591,
          "sceneId": 2991,
          "name": "Box 9216",
          "objectType": "logo",
          "x": 10,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 33,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59592,
          "sceneId": 2991,
          "name": "Box 9217",
          "objectType": "text",
          "x": 20,
          "y": 70,
          "width": 40,
          "height": 10,
          "zIndex": 34,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59593,
          "sceneId": 2991,
          "name": "Box 9218",
          "objectType": "text",
          "x": 60,
          "y": 70,
          "width": 40,
          "height": 10,
          "zIndex": 35,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59594,
          "sceneId": 2991,
          "name": "Box 9219",
          "objectType": "logo",
          "x": 10,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 37,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59595,
          "sceneId": 2991,
          "name": "Box 9220",
          "objectType": "text",
          "x": 0,
          "y": 10,
          "width": 50,
          "height": 10,
          "zIndex": 37,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "heat-number"
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom",
              "top"
            ],
            "borderWidth": 2,
            "backgroundColor": "#2e2727",
            "borderColor": "#ffdd00"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59596,
          "sceneId": 2991,
          "name": "Box 9221",
          "objectType": "text",
          "x": 20,
          "y": 80,
          "width": 40,
          "height": 10,
          "zIndex": 38,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59597,
          "sceneId": 2991,
          "name": "Box 9222",
          "objectType": "text",
          "x": 60,
          "y": 80,
          "width": 40,
          "height": 10,
          "zIndex": 39,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 1,
            "backgroundColor": "#001e57"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59598,
          "sceneId": 2991,
          "name": "Box 9223",
          "objectType": "logo",
          "x": 10,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 41,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 14,
            "textAlign": "center",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59599,
          "sceneId": 2991,
          "name": "Box 9224",
          "objectType": "text",
          "x": 20,
          "y": 90,
          "width": 40,
          "height": 10,
          "zIndex": 42,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        },
        {
          "id": 59600,
          "sceneId": 2991,
          "name": "Box 9225",
          "objectType": "text",
          "x": 60,
          "y": 90,
          "width": 40,
          "height": 10,
          "zIndex": 43,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "fontSize": 95,
            "textAlign": "left",
            "textColor": "#ffffff",
            "borderSides": [
              "bottom"
            ],
            "borderWidth": 0,
            "backgroundColor": "#002e7a"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:05.000Z"
        }
      ]
    },
    {
      "id": 2992,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P10-Field",
      "description": null,
      "canvasWidth": 192,
      "canvasHeight": 96,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59226,
          "sceneId": 2992,
          "name": "Box 3303",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59227,
          "sceneId": 2992,
          "name": "Box 3304",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 65,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 20,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59228,
          "sceneId": 2992,
          "name": "Box 3305",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 65,
          "height": 21,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#858585",
            "fontSize": 14,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59229,
          "sceneId": 2992,
          "name": "Box 3306",
          "objectType": "text",
          "x": 0,
          "y": 61,
          "width": 28,
          "height": 21,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 15,
            "textAlign": "center",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59230,
          "sceneId": 2992,
          "name": "Box 3307",
          "objectType": "text",
          "x": 28,
          "y": 61,
          "width": 40,
          "height": 21,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 17,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "solid"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59231,
          "sceneId": 2992,
          "name": "Box 3308",
          "objectType": "logo",
          "x": 67,
          "y": 20,
          "width": 34,
          "height": 79,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 14,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59232,
          "sceneId": 2992,
          "name": "Box 3309",
          "objectType": "text",
          "x": 0,
          "y": 81,
          "width": 37,
          "height": 19,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "attempt"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 12,
            "textAlign": "center",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59233,
          "sceneId": 2992,
          "name": "Box 3310",
          "objectType": "text",
          "x": 36,
          "y": 81,
          "width": 32,
          "height": 19,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "mark-converted"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#fbff00",
            "borderWidth": 2,
            "fontSize": 15,
            "textAlign": "right",
            "borderSides": [
              "right"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 2993,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "Big Board Lynx-Splits",
      "description": null,
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:39:29.000Z",
      "objects": [
        {
          "id": 59601,
          "sceneId": 2993,
          "name": "Box 9234",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 70,
          "height": 10,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59602,
          "sceneId": 2993,
          "name": "Box 9235",
          "objectType": "text",
          "x": 50,
          "y": 10,
          "width": 50,
          "height": 10,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "advancement-formula"
          },
          "config": {},
          "style": {
            "backgroundColor": "#2d2726",
            "textColor": "#ffffff",
            "borderColor": "#ffdd00",
            "borderWidth": 2,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom",
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59603,
          "sceneId": 2993,
          "name": "Box 9236",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 5,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59604,
          "sceneId": 2993,
          "name": "Box 9237",
          "objectType": "text",
          "x": 0,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 6,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59605,
          "sceneId": 2993,
          "name": "Box 9238",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59606,
          "sceneId": 2993,
          "name": "Box 9239",
          "objectType": "text",
          "x": 0,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59607,
          "sceneId": 2993,
          "name": "Box 9240",
          "objectType": "text",
          "x": 0,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59608,
          "sceneId": 2993,
          "name": "Box 9241",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59609,
          "sceneId": 2993,
          "name": "Box 9242",
          "objectType": "text",
          "x": 0,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59610,
          "sceneId": 2993,
          "name": "Box 9243",
          "objectType": "text",
          "x": 0,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 12,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59611,
          "sceneId": 2993,
          "name": "Box 9244",
          "objectType": "text",
          "x": 20,
          "y": 20,
          "width": 40,
          "height": 10,
          "zIndex": 13,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59612,
          "sceneId": 2993,
          "name": "Box 9245",
          "objectType": "text",
          "x": 60,
          "y": 20,
          "width": 20,
          "height": 10,
          "zIndex": 14,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffdd00",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59613,
          "sceneId": 2993,
          "name": "Box 9246",
          "objectType": "logo",
          "x": 10,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 15,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59614,
          "sceneId": 2993,
          "name": "Box 9247",
          "objectType": "text",
          "x": 80,
          "y": 20,
          "width": 20,
          "height": 10,
          "zIndex": 16,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59615,
          "sceneId": 2993,
          "name": "Box 9248",
          "objectType": "logo",
          "x": 10,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 17,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59616,
          "sceneId": 2993,
          "name": "Box 9249",
          "objectType": "text",
          "x": 20,
          "y": 30,
          "width": 40,
          "height": 10,
          "zIndex": 18,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59617,
          "sceneId": 2993,
          "name": "Box 9250",
          "objectType": "text",
          "x": 60,
          "y": 30,
          "width": 20,
          "height": 10,
          "zIndex": 19,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffdd00",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59618,
          "sceneId": 2993,
          "name": "Box 9251",
          "objectType": "text",
          "x": 80,
          "y": 30,
          "width": 20,
          "height": 10,
          "zIndex": 20,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59619,
          "sceneId": 2993,
          "name": "Box 9252",
          "objectType": "logo",
          "x": 10,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 21,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59620,
          "sceneId": 2993,
          "name": "Box 9253",
          "objectType": "text",
          "x": 20,
          "y": 40,
          "width": 40,
          "height": 10,
          "zIndex": 22,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59621,
          "sceneId": 2993,
          "name": "Box 9254",
          "objectType": "text",
          "x": 60,
          "y": 40,
          "width": 20,
          "height": 10,
          "zIndex": 23,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffdd00",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59622,
          "sceneId": 2993,
          "name": "Box 9255",
          "objectType": "text",
          "x": 80,
          "y": 40,
          "width": 20,
          "height": 10,
          "zIndex": 24,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59623,
          "sceneId": 2993,
          "name": "Box 9256",
          "objectType": "logo",
          "x": 10,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 25,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59624,
          "sceneId": 2993,
          "name": "Box 9257",
          "objectType": "text",
          "x": 20,
          "y": 50,
          "width": 40,
          "height": 10,
          "zIndex": 26,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59625,
          "sceneId": 2993,
          "name": "Box 9258",
          "objectType": "text",
          "x": 60,
          "y": 50,
          "width": 20,
          "height": 10,
          "zIndex": 27,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffdd00",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59626,
          "sceneId": 2993,
          "name": "Box 9259",
          "objectType": "text",
          "x": 80,
          "y": 50,
          "width": 20,
          "height": 10,
          "zIndex": 28,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59627,
          "sceneId": 2993,
          "name": "Box 9260",
          "objectType": "logo",
          "x": 10,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 29,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59628,
          "sceneId": 2993,
          "name": "Box 9261",
          "objectType": "text",
          "x": 20,
          "y": 60,
          "width": 40,
          "height": 10,
          "zIndex": 30,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59629,
          "sceneId": 2993,
          "name": "Box 9262",
          "objectType": "text",
          "x": 60,
          "y": 60,
          "width": 20,
          "height": 10,
          "zIndex": 31,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffdd00",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59630,
          "sceneId": 2993,
          "name": "Box 9263",
          "objectType": "text",
          "x": 80,
          "y": 60,
          "width": 20,
          "height": 10,
          "zIndex": 32,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59631,
          "sceneId": 2993,
          "name": "Box 9264",
          "objectType": "logo",
          "x": 10,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 33,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59632,
          "sceneId": 2993,
          "name": "Box 9265",
          "objectType": "text",
          "x": 20,
          "y": 70,
          "width": 40,
          "height": 10,
          "zIndex": 34,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59633,
          "sceneId": 2993,
          "name": "Box 9266",
          "objectType": "text",
          "x": 60,
          "y": 70,
          "width": 20,
          "height": 10,
          "zIndex": 35,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffdd00",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59634,
          "sceneId": 2993,
          "name": "Box 9267",
          "objectType": "text",
          "x": 80,
          "y": 70,
          "width": 20,
          "height": 10,
          "zIndex": 36,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59635,
          "sceneId": 2993,
          "name": "Box 9268",
          "objectType": "logo",
          "x": 10,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 37,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59636,
          "sceneId": 2993,
          "name": "Box 9269",
          "objectType": "text",
          "x": 20,
          "y": 80,
          "width": 40,
          "height": 10,
          "zIndex": 38,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59637,
          "sceneId": 2993,
          "name": "Box 9270",
          "objectType": "text",
          "x": 60,
          "y": 80,
          "width": 20,
          "height": 10,
          "zIndex": 39,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffdd00",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59638,
          "sceneId": 2993,
          "name": "Box 9271",
          "objectType": "text",
          "x": 80,
          "y": 80,
          "width": 20,
          "height": 10,
          "zIndex": 40,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59639,
          "sceneId": 2993,
          "name": "Box 9272",
          "objectType": "logo",
          "x": 10,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 41,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59640,
          "sceneId": 2993,
          "name": "Box 9273",
          "objectType": "text",
          "x": 20,
          "y": 90,
          "width": 40,
          "height": 10,
          "zIndex": 42,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59641,
          "sceneId": 2993,
          "name": "Box 9274",
          "objectType": "text",
          "x": 60,
          "y": 90,
          "width": 20,
          "height": 10,
          "zIndex": 43,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "last-split",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffdd00",
            "borderWidth": 0,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59642,
          "sceneId": 2993,
          "name": "Box 9275",
          "objectType": "text",
          "x": 80,
          "y": 90,
          "width": 20,
          "height": 10,
          "zIndex": 44,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "cumulative-split",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59643,
          "sceneId": 2993,
          "name": "Box 9276",
          "objectType": "text",
          "x": 70,
          "y": 0,
          "width": 30,
          "height": 10,
          "zIndex": 44,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "running-time"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        },
        {
          "id": 59644,
          "sceneId": 2993,
          "name": "Box 9277",
          "objectType": "text",
          "x": 0,
          "y": 10,
          "width": 50,
          "height": 10,
          "zIndex": 45,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "heat-number"
          },
          "config": {},
          "style": {
            "backgroundColor": "#2e2727",
            "textColor": "#ffffff",
            "borderColor": "#ffdd00",
            "borderWidth": 2,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom",
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:39:29.000Z"
        }
      ]
    },
    {
      "id": 2994,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "BigBoard-Hytek",
      "description": null,
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59278,
          "sceneId": 2994,
          "name": "Box 4025",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 70,
          "height": 10,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59279,
          "sceneId": 2994,
          "name": "Box 4026",
          "objectType": "text",
          "x": 0,
          "y": 10,
          "width": 100,
          "height": 10,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "round"
          },
          "config": {},
          "style": {
            "backgroundColor": "#2d2726",
            "textColor": "#ffffff",
            "borderColor": "#ffa200",
            "borderWidth": 2,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom",
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59280,
          "sceneId": 2994,
          "name": "Box 4027",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 5,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59281,
          "sceneId": 2994,
          "name": "Box 4028",
          "objectType": "text",
          "x": 0,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 6,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59282,
          "sceneId": 2994,
          "name": "Box 4029",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59283,
          "sceneId": 2994,
          "name": "Box 4030",
          "objectType": "text",
          "x": 0,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59284,
          "sceneId": 2994,
          "name": "Box 4031",
          "objectType": "text",
          "x": 0,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59285,
          "sceneId": 2994,
          "name": "Box 4032",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59286,
          "sceneId": 2994,
          "name": "Box 4033",
          "objectType": "text",
          "x": 0,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59287,
          "sceneId": 2994,
          "name": "Box 4034",
          "objectType": "text",
          "x": 0,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 12,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59288,
          "sceneId": 2994,
          "name": "Box 4035",
          "objectType": "text",
          "x": 20,
          "y": 20,
          "width": 60,
          "height": 10,
          "zIndex": 13,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59289,
          "sceneId": 2994,
          "name": "Box 4036",
          "objectType": "logo",
          "x": 10,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 15,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59290,
          "sceneId": 2994,
          "name": "Box 4037",
          "objectType": "text",
          "x": 80,
          "y": 20,
          "width": 20,
          "height": 10,
          "zIndex": 16,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59291,
          "sceneId": 2994,
          "name": "Box 4038",
          "objectType": "logo",
          "x": 10,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 17,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59292,
          "sceneId": 2994,
          "name": "Box 4039",
          "objectType": "text",
          "x": 20,
          "y": 30,
          "width": 60,
          "height": 10,
          "zIndex": 18,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59293,
          "sceneId": 2994,
          "name": "Box 4040",
          "objectType": "text",
          "x": 80,
          "y": 30,
          "width": 20,
          "height": 10,
          "zIndex": 20,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59294,
          "sceneId": 2994,
          "name": "Box 4041",
          "objectType": "logo",
          "x": 10,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 21,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59295,
          "sceneId": 2994,
          "name": "Box 4042",
          "objectType": "text",
          "x": 20,
          "y": 40,
          "width": 60,
          "height": 10,
          "zIndex": 22,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59296,
          "sceneId": 2994,
          "name": "Box 4043",
          "objectType": "text",
          "x": 80,
          "y": 40,
          "width": 20,
          "height": 10,
          "zIndex": 24,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59297,
          "sceneId": 2994,
          "name": "Box 4044",
          "objectType": "logo",
          "x": 10,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 25,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59298,
          "sceneId": 2994,
          "name": "Box 4045",
          "objectType": "text",
          "x": 20,
          "y": 50,
          "width": 60,
          "height": 10,
          "zIndex": 26,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59299,
          "sceneId": 2994,
          "name": "Box 4046",
          "objectType": "text",
          "x": 80,
          "y": 50,
          "width": 20,
          "height": 10,
          "zIndex": 28,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59300,
          "sceneId": 2994,
          "name": "Box 4047",
          "objectType": "logo",
          "x": 10,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 29,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59301,
          "sceneId": 2994,
          "name": "Box 4048",
          "objectType": "text",
          "x": 20,
          "y": 60,
          "width": 60,
          "height": 10,
          "zIndex": 30,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59302,
          "sceneId": 2994,
          "name": "Box 4049",
          "objectType": "text",
          "x": 80,
          "y": 60,
          "width": 20,
          "height": 10,
          "zIndex": 32,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59303,
          "sceneId": 2994,
          "name": "Box 4050",
          "objectType": "logo",
          "x": 10,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 33,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59304,
          "sceneId": 2994,
          "name": "Box 4051",
          "objectType": "text",
          "x": 20,
          "y": 70,
          "width": 60,
          "height": 10,
          "zIndex": 34,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59305,
          "sceneId": 2994,
          "name": "Box 4052",
          "objectType": "text",
          "x": 80,
          "y": 70,
          "width": 20,
          "height": 10,
          "zIndex": 36,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59306,
          "sceneId": 2994,
          "name": "Box 4053",
          "objectType": "logo",
          "x": 10,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 37,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59307,
          "sceneId": 2994,
          "name": "Box 4054",
          "objectType": "text",
          "x": 20,
          "y": 80,
          "width": 60,
          "height": 10,
          "zIndex": 38,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59308,
          "sceneId": 2994,
          "name": "Box 4055",
          "objectType": "text",
          "x": 80,
          "y": 80,
          "width": 20,
          "height": 10,
          "zIndex": 40,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59309,
          "sceneId": 2994,
          "name": "Box 4056",
          "objectType": "logo",
          "x": 10,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 41,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59310,
          "sceneId": 2994,
          "name": "Box 4057",
          "objectType": "text",
          "x": 20,
          "y": 90,
          "width": 60,
          "height": 10,
          "zIndex": 42,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59311,
          "sceneId": 2994,
          "name": "Box 4058",
          "objectType": "text",
          "x": 80,
          "y": 90,
          "width": 20,
          "height": 10,
          "zIndex": 44,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 2995,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P6-Running Time",
      "description": null,
      "canvasWidth": 288,
      "canvasHeight": 144,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59312,
          "sceneId": 2995,
          "name": "Box 7782",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 50,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59313,
          "sceneId": 2995,
          "name": "Box 7783",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 100,
          "height": 75,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "running-time"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 75,
            "textAlign": "center"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59314,
          "sceneId": 2995,
          "name": "Box 7784",
          "objectType": "text",
          "x": 50,
          "y": 0,
          "width": 50,
          "height": 20,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "heat-number"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 2996,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P6-Results",
      "description": null,
      "canvasWidth": 288,
      "canvasHeight": 144,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59315,
          "sceneId": 2996,
          "name": "Box 9418",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 60,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59316,
          "sceneId": 2996,
          "name": "Box 9419",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 70,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 25,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59317,
          "sceneId": 2996,
          "name": "Box 9420",
          "objectType": "text",
          "x": 0,
          "y": 45,
          "width": 65,
          "height": 21,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#858585",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59318,
          "sceneId": 2996,
          "name": "Box 9421",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 14,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 23,
            "textAlign": "center",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59319,
          "sceneId": 2996,
          "name": "Box 9422",
          "objectType": "text",
          "x": 28,
          "y": 70,
          "width": 40,
          "height": 30,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 26,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "solid"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59320,
          "sceneId": 2996,
          "name": "Box 9423",
          "objectType": "logo",
          "x": 68,
          "y": 21,
          "width": 32,
          "height": 77,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59321,
          "sceneId": 2996,
          "name": "Box 9424",
          "objectType": "text",
          "x": 60,
          "y": 0,
          "width": 40,
          "height": 20,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "heat-number"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59322,
          "sceneId": 2996,
          "name": "Box 9425",
          "objectType": "text",
          "x": 14,
          "y": 70,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 23,
            "textAlign": "center",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 2997,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P6-StartLists",
      "description": null,
      "canvasWidth": 288,
      "canvasHeight": 144,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59323,
          "sceneId": 2997,
          "name": "Box 7792",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 50,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59324,
          "sceneId": 2997,
          "name": "Box 7793",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 65,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 25,
            "textAlign": "left"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59325,
          "sceneId": 2997,
          "name": "Box 7794",
          "objectType": "text",
          "x": 0,
          "y": 45,
          "width": 65,
          "height": 25,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#9c9c9c",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59326,
          "sceneId": 2997,
          "name": "Box 7795",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 20,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "HIP:"
          },
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 24,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "solid"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59327,
          "sceneId": 2997,
          "name": "Box 7796",
          "objectType": "logo",
          "x": 66,
          "y": 20,
          "width": 33,
          "height": 80,
          "zIndex": 5,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 21,
            "textAlign": "left"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59328,
          "sceneId": 2997,
          "name": "Box 7797",
          "objectType": "text",
          "x": 20,
          "y": 70,
          "width": 45,
          "height": 30,
          "zIndex": 6,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "lane"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 24,
            "textAlign": "left",
            "borderSides": [
              "top",
              "right"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59329,
          "sceneId": 2997,
          "name": "Box 7798",
          "objectType": "text",
          "x": 50,
          "y": 0,
          "width": 50,
          "height": 20,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "heat-number"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 2998,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P6-Field",
      "description": null,
      "canvasWidth": 288,
      "canvasHeight": 144,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59330,
          "sceneId": 2998,
          "name": "Box 9132",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59331,
          "sceneId": 2998,
          "name": "Box 9133",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 65,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 30,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59332,
          "sceneId": 2998,
          "name": "Box 9134",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 65,
          "height": 21,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#858585",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59333,
          "sceneId": 2998,
          "name": "Box 9135",
          "objectType": "text",
          "x": 14,
          "y": 61,
          "width": 14,
          "height": 21,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 23,
            "textAlign": "left",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59334,
          "sceneId": 2998,
          "name": "Box 9136",
          "objectType": "text",
          "x": 28,
          "y": 61,
          "width": 40,
          "height": 21,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 26,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "solid"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59335,
          "sceneId": 2998,
          "name": "Box 9137",
          "objectType": "logo",
          "x": 69,
          "y": 20,
          "width": 31,
          "height": 80,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59336,
          "sceneId": 2998,
          "name": "Box 9138",
          "objectType": "text",
          "x": 0,
          "y": 81,
          "width": 34,
          "height": 19,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "attempt"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 18,
            "textAlign": "left",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59337,
          "sceneId": 2998,
          "name": "Box 9139",
          "objectType": "text",
          "x": 33,
          "y": 81,
          "width": 35,
          "height": 19,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "mark-converted"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#eeff00",
            "borderWidth": 2,
            "fontSize": 23,
            "textAlign": "right",
            "borderSides": [
              "right"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59338,
          "sceneId": 2998,
          "name": "Box 9140",
          "objectType": "text",
          "x": 0,
          "y": 61,
          "width": 14,
          "height": 21,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 23,
            "textAlign": "left",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 3000,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "BigBoard Field",
      "description": null,
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:06.000Z",
      "updatedAt": "2026-04-28T22:25:06.000Z",
      "objects": [
        {
          "id": 59350,
          "sceneId": 3000,
          "name": "Box 823",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 149,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59351,
          "sceneId": 3000,
          "name": "Box 824",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 65,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 213,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59352,
          "sceneId": 3000,
          "name": "Box 825",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 65,
          "height": 21,
          "zIndex": 3,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#858585",
            "fontSize": 149,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59353,
          "sceneId": 3000,
          "name": "Box 826",
          "objectType": "text",
          "x": 18,
          "y": 61,
          "width": 10,
          "height": 21,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 163,
            "textAlign": "left",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59354,
          "sceneId": 3000,
          "name": "Box 827",
          "objectType": "text",
          "x": 28,
          "y": 61,
          "width": 40,
          "height": 21,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 184,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "solid"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59355,
          "sceneId": 3000,
          "name": "Box 828",
          "objectType": "logo",
          "x": 70,
          "y": 20,
          "width": 25,
          "height": 40,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "athlete-photo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 149,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59356,
          "sceneId": 3000,
          "name": "Box 829",
          "objectType": "text",
          "x": 0,
          "y": 81,
          "width": 37,
          "height": 19,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "attempt"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 128,
            "textAlign": "left",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59357,
          "sceneId": 3000,
          "name": "Box 830",
          "objectType": "text",
          "x": 36,
          "y": 81,
          "width": 32,
          "height": 19,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "mark-converted"
          },
          "config": {},
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#fbff00",
            "borderWidth": 2,
            "fontSize": 163,
            "textAlign": "right",
            "borderSides": [
              "right"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59358,
          "sceneId": 3000,
          "name": "Box 831",
          "objectType": "logo",
          "x": 70,
          "y": 60,
          "width": 25,
          "height": 40,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "meet-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 149,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        },
        {
          "id": 59359,
          "sceneId": 3000,
          "name": "Box 832",
          "objectType": "text",
          "x": 0,
          "y": 61,
          "width": 18,
          "height": 20,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "Pl:"
          },
          "style": {
            "backgroundColor": "#000039",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 163,
            "textAlign": "left",
            "borderSides": [
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:25:06.000Z"
        }
      ]
    },
    {
      "id": 3001,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P6-Hytek",
      "description": null,
      "canvasWidth": 288,
      "canvasHeight": 144,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:25:38.000Z",
      "updatedAt": "2026-04-28T22:30:24.000Z",
      "objects": [
        {
          "id": 59368,
          "sceneId": 3001,
          "name": "Box 9360",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59369,
          "sceneId": 3001,
          "name": "Box 9361",
          "objectType": "text",
          "x": 25,
          "y": 18,
          "width": 75,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 25,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59370,
          "sceneId": 3001,
          "name": "Box 9363",
          "objectType": "text",
          "x": 25,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59371,
          "sceneId": 3001,
          "name": "Box 9364",
          "objectType": "text",
          "x": 53,
          "y": 35,
          "width": 47,
          "height": 30,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 26,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59372,
          "sceneId": 3001,
          "name": "Box 9365",
          "objectType": "logo",
          "x": 0,
          "y": 20,
          "width": 25,
          "height": 40,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59374,
          "sceneId": 3001,
          "name": "Box tcz8",
          "objectType": "text",
          "x": 25,
          "y": 58,
          "width": 75,
          "height": 25,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 25,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59373,
          "sceneId": 3001,
          "name": "Box 9367",
          "objectType": "text",
          "x": 39,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59375,
          "sceneId": 3001,
          "name": "Box lo26",
          "objectType": "text",
          "x": 25,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59376,
          "sceneId": 3001,
          "name": "Box 62gm",
          "objectType": "text",
          "x": 40,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59377,
          "sceneId": 3001,
          "name": "Box 3rhk",
          "objectType": "text",
          "x": 60,
          "y": 75,
          "width": 40,
          "height": 30,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 26,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        },
        {
          "id": 59378,
          "sceneId": 3001,
          "name": "Box ywa0",
          "objectType": "logo",
          "x": 0,
          "y": 60,
          "width": 25,
          "height": 40,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:30:24.000Z"
        }
      ]
    },
    {
      "id": 3002,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P6-TeamScores",
      "description": null,
      "canvasWidth": 288,
      "canvasHeight": 144,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:30:41.000Z",
      "updatedAt": "2026-04-28T22:32:34.000Z",
      "objects": [
        {
          "id": 59390,
          "sceneId": 3002,
          "name": "Box 9379",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 21,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59391,
          "sceneId": 3002,
          "name": "Box 9380",
          "objectType": "text",
          "x": 25,
          "y": 18,
          "width": 50,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 25,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59392,
          "sceneId": 3002,
          "name": "Box 9381",
          "objectType": "text",
          "x": 25,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59393,
          "sceneId": 3002,
          "name": "Box 9382",
          "objectType": "text",
          "x": 75,
          "y": 18,
          "width": 25,
          "height": 25,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 25,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59394,
          "sceneId": 3002,
          "name": "Box 9383",
          "objectType": "logo",
          "x": 0,
          "y": 20,
          "width": 25,
          "height": 40,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59395,
          "sceneId": 3002,
          "name": "Box 9384",
          "objectType": "text",
          "x": 25,
          "y": 58,
          "width": 50,
          "height": 25,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 25,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59396,
          "sceneId": 3002,
          "name": "Box 9385",
          "objectType": "text",
          "x": 39,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59397,
          "sceneId": 3002,
          "name": "Box 9386",
          "objectType": "text",
          "x": 25,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59398,
          "sceneId": 3002,
          "name": "Box 9387",
          "objectType": "text",
          "x": 40,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 23,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59399,
          "sceneId": 3002,
          "name": "Box 9388",
          "objectType": "text",
          "x": 75,
          "y": 58,
          "width": 25,
          "height": 25,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 25,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        },
        {
          "id": 59400,
          "sceneId": 3002,
          "name": "Box 9389",
          "objectType": "logo",
          "x": 0,
          "y": 60,
          "width": 25,
          "height": 40,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 21,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:32:34.000Z"
        }
      ]
    },
    {
      "id": 3003,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P10-Hytek",
      "description": null,
      "canvasWidth": 192,
      "canvasHeight": 96,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:33:32.000Z",
      "updatedAt": "2026-04-28T22:33:40.000Z",
      "objects": [
        {
          "id": 59412,
          "sceneId": 3003,
          "name": "Box 9401",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59413,
          "sceneId": 3003,
          "name": "Box 9402",
          "objectType": "text",
          "x": 25,
          "y": 18,
          "width": 75,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 17,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59414,
          "sceneId": 3003,
          "name": "Box 9403",
          "objectType": "text",
          "x": 25,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59415,
          "sceneId": 3003,
          "name": "Box 9404",
          "objectType": "text",
          "x": 53,
          "y": 35,
          "width": 47,
          "height": 30,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 17,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59416,
          "sceneId": 3003,
          "name": "Box 9405",
          "objectType": "logo",
          "x": 0,
          "y": 20,
          "width": 25,
          "height": 40,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 14,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59417,
          "sceneId": 3003,
          "name": "Box 9406",
          "objectType": "text",
          "x": 25,
          "y": 58,
          "width": 75,
          "height": 25,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 17,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59418,
          "sceneId": 3003,
          "name": "Box 9407",
          "objectType": "text",
          "x": 39,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59419,
          "sceneId": 3003,
          "name": "Box 9408",
          "objectType": "text",
          "x": 25,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59420,
          "sceneId": 3003,
          "name": "Box 9409",
          "objectType": "text",
          "x": 40,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59421,
          "sceneId": 3003,
          "name": "Box 9410",
          "objectType": "text",
          "x": 60,
          "y": 75,
          "width": 40,
          "height": 30,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 17,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        },
        {
          "id": 59422,
          "sceneId": 3003,
          "name": "Box 9411",
          "objectType": "logo",
          "x": 0,
          "y": 60,
          "width": 25,
          "height": 40,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 14,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:40.000Z"
        }
      ]
    },
    {
      "id": 3004,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "P10-TeamScores",
      "description": null,
      "canvasWidth": 192,
      "canvasHeight": 96,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:33:54.000Z",
      "updatedAt": "2026-04-28T22:33:55.000Z",
      "objects": [
        {
          "id": 59434,
          "sceneId": 3004,
          "name": "Box 9423",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "#00004b",
            "textColor": "#ffffff",
            "borderWidth": 2,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59435,
          "sceneId": 3004,
          "name": "Box 9424",
          "objectType": "text",
          "x": 25,
          "y": 18,
          "width": 50,
          "height": 25,
          "zIndex": 2,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 17,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59436,
          "sceneId": 3004,
          "name": "Box 9425",
          "objectType": "text",
          "x": 25,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59437,
          "sceneId": 3004,
          "name": "Box 9426",
          "objectType": "text",
          "x": 75,
          "y": 18,
          "width": 25,
          "height": 25,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 17,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59438,
          "sceneId": 3004,
          "name": "Box 9427",
          "objectType": "logo",
          "x": 0,
          "y": 20,
          "width": 25,
          "height": 40,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 14,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59439,
          "sceneId": 3004,
          "name": "Box 9428",
          "objectType": "text",
          "x": 25,
          "y": 58,
          "width": 50,
          "height": 25,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 17,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59440,
          "sceneId": 3004,
          "name": "Box 9429",
          "objectType": "text",
          "x": 39,
          "y": 35,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59441,
          "sceneId": 3004,
          "name": "Box 9430",
          "objectType": "text",
          "x": 25,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "static",
            "fieldKey": "static-text",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "center",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59442,
          "sceneId": 3004,
          "name": "Box 9431",
          "objectType": "text",
          "x": 40,
          "y": 75,
          "width": 14,
          "height": 30,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {
            "dynamicText": "PL:"
          },
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 15,
            "textAlign": "left",
            "borderSides": [
              "top"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59443,
          "sceneId": 3004,
          "name": "Box 9432",
          "objectType": "text",
          "x": 75,
          "y": 58,
          "width": 25,
          "height": 25,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "borderWidth": 0,
            "fontSize": 17,
            "textAlign": "right",
            "borderSides": [
              "top",
              "right"
            ],
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        },
        {
          "id": 59444,
          "sceneId": 3004,
          "name": "Box 9433",
          "objectType": "logo",
          "x": 0,
          "y": 60,
          "width": 25,
          "height": 40,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "transparent",
            "textColor": "#ffffff",
            "fontSize": 14,
            "textAlign": "left",
            "backgroundStyle": "transparent"
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:33:55.000Z"
        }
      ]
    },
    {
      "id": 3005,
      "meetId": "dea6737a-ceae-4196-8554-5f5b7837802e",
      "name": "BigBoard-TeamScores",
      "description": null,
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "aspectRatio": "16:9",
      "backgroundColor": "#000000",
      "backgroundImage": null,
      "isTemplate": false,
      "createdAt": "2026-04-28T22:36:27.000Z",
      "updatedAt": "2026-04-28T22:37:13.000Z",
      "objects": [
        {
          "id": 59479,
          "sceneId": 3005,
          "name": "Box 9445",
          "objectType": "text",
          "x": 0,
          "y": 0,
          "width": 60,
          "height": 10,
          "zIndex": 1,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "event-name"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59480,
          "sceneId": 3005,
          "name": "Box 9446",
          "objectType": "text",
          "x": 0,
          "y": 10,
          "width": 100,
          "height": 10,
          "zIndex": 4,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "team-score-badges"
          },
          "config": {},
          "style": {
            "backgroundColor": "#2d2726",
            "textColor": "#ffffff",
            "borderColor": "#ffea00",
            "borderWidth": 2,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom",
              "top"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59481,
          "sceneId": 3005,
          "name": "Box 9447",
          "objectType": "text",
          "x": 0,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 5,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59482,
          "sceneId": 3005,
          "name": "Box 9448",
          "objectType": "text",
          "x": 0,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 6,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59483,
          "sceneId": 3005,
          "name": "Box 9449",
          "objectType": "text",
          "x": 0,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 7,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59484,
          "sceneId": 3005,
          "name": "Box 9450",
          "objectType": "text",
          "x": 0,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 8,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59485,
          "sceneId": 3005,
          "name": "Box 9451",
          "objectType": "text",
          "x": 0,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 9,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59486,
          "sceneId": 3005,
          "name": "Box 9452",
          "objectType": "text",
          "x": 0,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 10,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59487,
          "sceneId": 3005,
          "name": "Box 9453",
          "objectType": "text",
          "x": 0,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 11,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59488,
          "sceneId": 3005,
          "name": "Box 9454",
          "objectType": "text",
          "x": 0,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 12,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "place",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59489,
          "sceneId": 3005,
          "name": "Box 9455",
          "objectType": "text",
          "x": 20,
          "y": 20,
          "width": 60,
          "height": 10,
          "zIndex": 13,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59490,
          "sceneId": 3005,
          "name": "Box 9456",
          "objectType": "logo",
          "x": 10,
          "y": 20,
          "width": 10,
          "height": 10,
          "zIndex": 15,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59491,
          "sceneId": 3005,
          "name": "Box 9457",
          "objectType": "text",
          "x": 80,
          "y": 20,
          "width": 20,
          "height": 10,
          "zIndex": 16,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time"
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59492,
          "sceneId": 3005,
          "name": "Box 9458",
          "objectType": "logo",
          "x": 10,
          "y": 30,
          "width": 10,
          "height": 10,
          "zIndex": 17,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59493,
          "sceneId": 3005,
          "name": "Box 9459",
          "objectType": "text",
          "x": 20,
          "y": 30,
          "width": 60,
          "height": 10,
          "zIndex": 18,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59494,
          "sceneId": 3005,
          "name": "Box 9460",
          "objectType": "text",
          "x": 80,
          "y": 30,
          "width": 20,
          "height": 10,
          "zIndex": 20,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 1
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59495,
          "sceneId": 3005,
          "name": "Box 9461",
          "objectType": "logo",
          "x": 10,
          "y": 40,
          "width": 10,
          "height": 10,
          "zIndex": 21,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59496,
          "sceneId": 3005,
          "name": "Box 9462",
          "objectType": "text",
          "x": 20,
          "y": 40,
          "width": 60,
          "height": 10,
          "zIndex": 22,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59497,
          "sceneId": 3005,
          "name": "Box 9463",
          "objectType": "text",
          "x": 80,
          "y": 40,
          "width": 20,
          "height": 10,
          "zIndex": 24,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 2
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59498,
          "sceneId": 3005,
          "name": "Box 9464",
          "objectType": "logo",
          "x": 10,
          "y": 50,
          "width": 10,
          "height": 10,
          "zIndex": 25,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59499,
          "sceneId": 3005,
          "name": "Box 9465",
          "objectType": "text",
          "x": 20,
          "y": 50,
          "width": 60,
          "height": 10,
          "zIndex": 26,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59500,
          "sceneId": 3005,
          "name": "Box 9466",
          "objectType": "text",
          "x": 80,
          "y": 50,
          "width": 20,
          "height": 10,
          "zIndex": 28,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 3
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59501,
          "sceneId": 3005,
          "name": "Box 9467",
          "objectType": "logo",
          "x": 10,
          "y": 60,
          "width": 10,
          "height": 10,
          "zIndex": 29,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59502,
          "sceneId": 3005,
          "name": "Box 9468",
          "objectType": "text",
          "x": 20,
          "y": 60,
          "width": 60,
          "height": 10,
          "zIndex": 30,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59503,
          "sceneId": 3005,
          "name": "Box 9469",
          "objectType": "text",
          "x": 80,
          "y": 60,
          "width": 20,
          "height": 10,
          "zIndex": 32,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 4
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59504,
          "sceneId": 3005,
          "name": "Box 9470",
          "objectType": "logo",
          "x": 10,
          "y": 70,
          "width": 10,
          "height": 10,
          "zIndex": 33,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59505,
          "sceneId": 3005,
          "name": "Box 9471",
          "objectType": "text",
          "x": 20,
          "y": 70,
          "width": 60,
          "height": 10,
          "zIndex": 34,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59513,
          "sceneId": 3005,
          "name": "Box q8mh",
          "objectType": "text",
          "x": 60,
          "y": 0,
          "width": 40,
          "height": 10,
          "zIndex": 35,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "total-events-scored"
          },
          "config": {},
          "style": {
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textColor": "#ffffff",
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59506,
          "sceneId": 3005,
          "name": "Box 9472",
          "objectType": "text",
          "x": 80,
          "y": 70,
          "width": 20,
          "height": 10,
          "zIndex": 36,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 5
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59507,
          "sceneId": 3005,
          "name": "Box 9473",
          "objectType": "logo",
          "x": 10,
          "y": 80,
          "width": 10,
          "height": 10,
          "zIndex": 37,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59508,
          "sceneId": 3005,
          "name": "Box 9474",
          "objectType": "text",
          "x": 20,
          "y": 80,
          "width": 60,
          "height": 10,
          "zIndex": 38,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59509,
          "sceneId": 3005,
          "name": "Box 9475",
          "objectType": "text",
          "x": 80,
          "y": 80,
          "width": 20,
          "height": 10,
          "zIndex": 40,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 6
          },
          "config": {},
          "style": {
            "backgroundColor": "#001e57",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59510,
          "sceneId": 3005,
          "name": "Box 9476",
          "objectType": "logo",
          "x": 10,
          "y": 90,
          "width": 10,
          "height": 10,
          "zIndex": 41,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "school-logo",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 14,
            "textAlign": "center",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59511,
          "sceneId": 3005,
          "name": "Box 9477",
          "objectType": "text",
          "x": 20,
          "y": 90,
          "width": 60,
          "height": 10,
          "zIndex": 42,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "name-qualifier",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "left",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        },
        {
          "id": 59512,
          "sceneId": 3005,
          "name": "Box 9478",
          "objectType": "text",
          "x": 80,
          "y": 90,
          "width": 20,
          "height": 10,
          "zIndex": 44,
          "rotation": 0,
          "dataBinding": {
            "sourceType": "live-data",
            "fieldKey": "time",
            "athleteIndex": 7
          },
          "config": {},
          "style": {
            "backgroundColor": "#002e7a",
            "textColor": "#ffffff",
            "borderWidth": 1,
            "fontSize": 95,
            "textAlign": "right",
            "borderSides": [
              "bottom"
            ]
          },
          "visible": true,
          "locked": false,
          "createdAt": "2026-04-28T22:37:13.000Z"
        }
      ]
    }
  ],
  "sceneMappings": [
    {
      "displayType": "P10",
      "displayMode": "start_list",
      "sceneName": "P10-Start List"
    },
    {
      "displayType": "P10",
      "displayMode": "running_time",
      "sceneName": "P10-Running Time"
    },
    {
      "displayType": "P10",
      "displayMode": "track_results",
      "sceneName": "P10-Results"
    },
    {
      "displayType": "P10",
      "displayMode": "field_results",
      "sceneName": "P10-Field"
    },
    {
      "displayType": "P10",
      "displayMode": "hytek_results",
      "sceneName": "P10-Hytek"
    },
    {
      "displayType": "P10",
      "displayMode": "team_scores",
      "sceneName": "P10-TeamScores"
    },
    {
      "displayType": "P6",
      "displayMode": "start_list",
      "sceneName": "P6-StartLists"
    },
    {
      "displayType": "P6",
      "displayMode": "running_time",
      "sceneName": "P6-Running Time"
    },
    {
      "displayType": "P6",
      "displayMode": "track_results",
      "sceneName": "P6-Results"
    },
    {
      "displayType": "P6",
      "displayMode": "field_results",
      "sceneName": "P6-Field"
    },
    {
      "displayType": "P6",
      "displayMode": "hytek_results",
      "sceneName": "P6-Hytek"
    },
    {
      "displayType": "P6",
      "displayMode": "team_scores",
      "sceneName": "P6-TeamScores"
    },
    {
      "displayType": "BigBoard",
      "displayMode": "start_list",
      "sceneName": "Bib Board Lynx-Starts"
    },
    {
      "displayType": "BigBoard",
      "displayMode": "running_time",
      "sceneName": "Big Board Lynx-Splits"
    },
    {
      "displayType": "BigBoard",
      "displayMode": "track_results",
      "sceneName": "Big Board Lynx-Results"
    },
    {
      "displayType": "BigBoard",
      "displayMode": "field_results",
      "sceneName": "BigBoard Field"
    },
    {
      "displayType": "BigBoard",
      "displayMode": "hytek_results",
      "sceneName": "BigBoard-Hytek"
    },
    {
      "displayType": "BigBoard",
      "displayMode": "team_scores",
      "sceneName": "BigBoard-TeamScores"
    }
  ]
} as const;

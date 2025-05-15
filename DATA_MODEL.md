## 🧾 Data Model (GeoJSON Features)

Each dataset is a valid [GeoJSON FeatureCollection](https://geojson.org/), where each `Feature` includes a `geometry` and a `properties` object.

### 🔹 Common Fields (all feature types)

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-73.935242, 40.730610]
  },
  "properties": {
    "type": "fan_wish" | "singer_activity" | "fan_meetup",
    "city": "New York",
    "country": "USA",
    "timestamp": "2024-05-01T18:00:00Z",
    "display_color": "#FF69B4",
    "emoji": "💖",
    "icon_url": "https://example.com/icon.png"
  }
}
```

### 💌 Fan Wishes (`type = fan_wish`)
| Field           | Type     | Required | Description                       |
| --------------- | -------- | -------- | --------------------------------- |
| `fan_name`      | string   | Optional | Displayed name or alias           |
| `message`       | string   | ✅        | The actual wish or note from fan  |
| `city`          | string   | ✅        | Used for location and grouping    |
| `country`       | string   | ✅        | Display on card                   |
| `timestamp`     | datetime | Optional | When the wish was submitted       |
| `emoji`         | string   | Optional | For custom marker (e.g., 🎵 💖 ✨) |
| `display_color` | string   | Optional | Hex code to style marker          |


### 🎤 Singer Activities (`type = singer_activity`)

| Field           | Type   | Required | Description                            |
| --------------- | ------ | -------- | -------------------------------------- |
| `title`         | string | ✅        | Event name (e.g., "Concert in LA")     |
| `date`          | string | ✅        | e.g., "2024-09-12"                     |
| `venue`         | string | Optional | Name of the venue                      |
| `city`          | string | ✅        |                                        |
| `country`       | string | ✅        |                                        |
| `link`          | string | Optional | External link (video, article, ticket) |
| `display_color` | string | Optional | Custom color for markers               |

### 🎉 Fan Meetups (`type = fan_meetup`)

| Field           | Type   | Required | Description                                  |
| --------------- | ------ | -------- | -------------------------------------------- |
| `title`         | string | ✅        | Meetup name (e.g., "NYC Birthday Gathering") |
| `date`          | string | ✅        | When the event happened                      |
| `city`          | string | ✅        |                                              |
| `country`       | string | ✅        |                                              |
| `media_urls`    | array  | Optional | Photos or videos from the event              |
| `notes`         | string | Optional | Description or highlights                    |
| `display_color` | string | Optional | Custom color or theme                        |

### ✅ Custom Display Fields (optional)

| Property        | Type   | Description                                      |
| --------------- | ------ | ------------------------------------------------ |
| `emoji`         | string | Use emoji as marker (fallback to icon if absent) |
| `icon_url`      | string | Custom marker icon (overrides emoji)             |
| `display_color` | string | Marker color in HEX (e.g., `#00BFFF`)            |
| `popup_html`    | string | Pre-rendered popup content (optional override)   |

> Note: These attributes are parsed on the frontend to generate custom popups and markers.
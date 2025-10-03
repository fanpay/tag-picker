# Kontent.ai Tag Picker Custom Element

A sophisticated custom element for Kontent.ai that provides hierarchical tag selection with multi-select capabilities and search functionality.

## Features

- 🏷️ **Hierarchical Tag Selection**: Support for parent-child tag relationships
- 🔍 **Real-time Search**: Filter tags as you type with autocomplete
- ✅ **Multi-select Interface**: Select multiple tags with visual feedback
- 🌍 **Language Support**: Works with Kontent.ai language variants
- ⚙️ **Configurable**: Optional parent tag filtering
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔒 **Context-Aware**: Uses Kontent.ai project context (no hardcoded values)

## Technology Stack

- **React 19.1.1** with TypeScript
- **Vite 7.1.7** for development and building
- **@kontent-ai/delivery-sdk 16.3.0** for content fetching
- **Downshift 9.0.10** for accessible multi-select component
- **ESLint** for code quality

## Installation & Setup

### 1. Build the Custom Element

```bash
cd app
npm install
npm run build
```

### 2. Deploy to Hosting

Upload the contents of the `app/dist/` folder to your web server or hosting platform (Netlify, Vercel, etc.).

### 3. Add to Kontent.ai

1. In your Kontent.ai project, go to **Content types**
2. Add a new **Custom element**
3. Set the **Hosted code URL** to your deployed URL
4. Configure the element parameters (optional):

```json
{
  "parentTagCodename": "your-parent-tag-codename"
}
```

### 4. Configure Content Type

Add the custom element to any content type where you need tag selection. The element will:
- Automatically detect the current project and language context
- Fetch available tags using the Kontent.ai Delivery SDK
- Store selected tag codenames as an array

## Configuration Options

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `parentTagCodename` | string | Filters tags to show only descendants of the specified parent tag | No |

### Example Configuration

```json
{
  "parentTagCodename": "product-categories"
}
```

## Development

### Local Development

```bash
cd app
npm install
npm run dev
```

The development server will start at `https://localhost:5173/` with SSL certificates for Kontent.ai integration.

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint checks

### Project Structure

```
app/
├── src/
│   ├── App.tsx           # Main component with tag picker logic
│   ├── App.css           # Styling for the component
│   ├── main.tsx          # Application entry point
│   ├── shared.tsx        # Shared utilities (if any)
│   └── assets/           # Static assets
├── public/               # Public assets
├── dist/                 # Built files (generated)
└── package.json          # Dependencies and scripts
```

### Key Components

#### App.tsx
The main component that handles:
- Kontent.ai Custom Element API integration
- Tag fetching using the delivery SDK
- Hierarchical tag tree building
- Multi-select interface with Downshift
- State management for selected tags

## How It Works

1. **Initialization**: The custom element initializes with Kontent.ai context
2. **Context Reading**: Extracts project ID, language variant, and configuration
3. **Tag Fetching**: Uses the Delivery SDK to fetch tags from the `_tag` content type
4. **Hierarchy Building**: Constructs parent-child relationships based on the `parent_tag` field
5. **User Interface**: Provides searchable multi-select dropdown with visual hierarchy
6. **Value Storage**: Saves selected tag codenames back to Kontent.ai

## Tag Content Type Requirements

The custom element expects tags to be stored in a content type called `_tag` with the following elements:

- `name` (Text element): The display name of the tag
- `parent_tag` (Modular content element): References to parent tags (for hierarchy)

## Browser Support

- Modern browsers with ES2015+ support
- Tested with Chrome, Firefox, Safari, and Edge
- Mobile responsive design

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes in the `app/` directory
4. Test thoroughly
5. Submit a pull request

## License

This project is part of a Kontent.ai tutorial and is provided as-is for educational purposes.

## Troubleshooting

### Common Issues

1. **Tags not loading**: Check that your project has a `_tag` content type with the required elements
2. **SSL errors in development**: The local certificates are included for Kontent.ai HTTPS requirements
3. **Configuration not working**: Ensure the JSON configuration is valid and the parent tag codename exists

### Debug Information

The component logs useful information to the browser console:
- Project ID and language being used
- Number of tags fetched
- Configuration applied
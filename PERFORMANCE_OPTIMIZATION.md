# Performance Optimization Guide

## Current Issues Identified

Based on the HAR file analysis, your site is experiencing slow loading due to:

1. **WebSocket blocking for ~60 seconds** - Dev server connection issues
2. **Slow JavaScript bundle loading** - Multiple lucide-react modules taking ~4 seconds each
3. **Inefficient module resolution** - Many separate requests instead of bundled files
4. **Wait times dominating** - Browser waiting for dev server compilation

## Solutions Implemented

### 1. Vite Configuration Optimizations

- **Dependency pre-bundling**: Enabled `optimizeDeps.include` for lucide-react
- **Chunk splitting**: Manual chunks for vendor, lucide, and supabase libraries
- **ESBuild optimizations**: Target ES2020 for better performance
- **Server optimizations**: Disabled HMR overlay, optimized file watching

### 2. Icon Import Optimization

- **Centralized imports**: Created `src/lib/icons.ts` to consolidate all lucide-react imports
- **Reduced module requests**: Single import file instead of multiple component-level imports
- **Better tree-shaking**: Vite can now optimize icon imports more effectively

### 3. Development Scripts

- **`npm run optimize`**: Cleans cache and pre-bundles dependencies
- **`npm run dev:fast`**: Runs optimization before starting dev server

## Usage Instructions

### For Faster Development

```bash
# First time or after dependency changes
npm run optimize

# Start optimized dev server
npm run dev:fast

# Or run optimization separately
npm run optimize && npm run dev
```

### Performance Monitoring

The app now includes a performance monitor (bottom-right corner in development) that shows:
- DOM Ready time
- Load Complete time
- First Paint time
- First Contentful Paint time

## Additional Optimizations

### 1. Clear Vite Cache

If you still experience slow loading:

```bash
# Remove Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install

# Run optimization
npm run optimize
```

### 2. Browser Cache

- Clear browser cache and local storage
- Disable browser extensions that might interfere
- Use incognito/private mode for testing

### 3. Network Issues

- Check if localhost:5173 is accessible
- Ensure no firewall/antivirus blocking the dev server
- Try different ports if 5173 is blocked

## Expected Results

After implementing these optimizations:

- **Initial load time**: Should reduce from 60+ seconds to under 10 seconds
- **Icon loading**: Should reduce from 4+ seconds per icon to under 1 second
- **Module requests**: Should consolidate into fewer, larger chunks
- **WebSocket connection**: Should establish much faster

## Troubleshooting

### Still Slow After Optimization?

1. Check browser console for errors
2. Verify all imports use `../lib/icons` instead of `lucide-react`
3. Run `npm run build` to check for build issues
4. Monitor network tab for remaining slow requests

### Performance Monitor Not Showing?

- Ensure you're in development mode (`NODE_ENV=development`)
- Check browser console for errors
- Verify the component is imported and rendered

## Future Optimizations

Consider implementing:

1. **Code splitting**: Lazy load components that aren't immediately needed
2. **Image optimization**: Compress and optimize meal images
3. **Bundle analysis**: Use `npm run build` and analyze bundle size
4. **Service worker**: Cache static assets for offline use

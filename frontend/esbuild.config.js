import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outdir: 'dist',
    format: 'esm',
    splitting: true,
    sourcemap: true,
    minify: !isWatch,
    target: ['es2020'],
    loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
    },
    external: [],
    define: {
        'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
    },
};

async function build() {
    // Ensure dist directory exists
    mkdirSync('dist', { recursive: true });

    // Copy static files
    copyFileSync('src/index.html', 'dist/index.html');
    copyFileSync('src/manifest.json', 'dist/manifest.json');

    if (isWatch) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching for changes...');
    } else {
        await esbuild.build(buildOptions);
        console.log('Build complete');
    }
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});

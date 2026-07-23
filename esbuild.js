import esbuild from 'esbuild';
const artifacts = [{ src: 'src/worker.js', dest: 'dist/worker.js' }];

(async () => {
    for (const artifact of artifacts) {
        await esbuild.build({
            entryPoints: [artifact.src],
            bundle: true,
            outfile: artifact.dest,
            sourcemap: false,
            minify: true,
            target: ['es2022'],
            format: 'esm',
            platform: 'browser',
        });
        console.log(`✔️ 打包完成: ${artifact.src} → ${artifact.dest}`);
    }
})();
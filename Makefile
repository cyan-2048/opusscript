OPUS_NATIVE_DIR=./opus-native

# EMCC_OPTS=-Wall -O3 --llvm-lto 3 -flto -s NO_DYNAMIC_EXECUTION=1 -s ALLOW_MEMORY_GROWTH=1 -s NO_FILESYSTEM=1 -s EXPORTED_RUNTIME_METHODS="['setValue', 'getValue']" -s EXPORTED_FUNCTIONS="['_malloc', '_opus_strerror', '_free']" -s MODULARIZE=1 -s NODEJS_CATCH_EXIT=0 -s NODEJS_CATCH_REJECTION=0
EMCC_OPTS=-O3 -s SINGLE_FILE=1 -s ASM_JS=1 -s NO_DYNAMIC_EXECUTION=1 -s NO_FILESYSTEM=1 -s EXPORTED_RUNTIME_METHODS="['setValue', 'getValue']" -s EXPORTED_FUNCTIONS="['_malloc', '_opus_strerror', '_free']" -s MODULARIZE=1 -s NODEJS_CATCH_EXIT=0 -s NODEJS_CATCH_REJECTION=0
EMCC_NASM_OPTS=-s WASM=0 -s WASM_ASYNC_COMPILATION=0 -s ENVIRONMENT=web,worker
EMCC_WASM_OPTS=-s WASM=1 -s WASM_ASYNC_COMPILATION=0 -s WASM_BIGINT

all: init compile
autogen:
	cd $(OPUS_NATIVE_DIR); \
	./autogen.sh
configure:
	cd $(OPUS_NATIVE_DIR); \
	emconfigure ./configure --enable-optimized --disable-assertions --enable-targets=host,js
bind:
	cd $(OPUS_NATIVE_DIR); \
	emmake make; \
	rm -f a.wasm
init: autogen configure bind
compile:
	rm -rf ./build; \
	mkdir -p ./build; \
	em++ ${EMCC_OPTS} ${EMCC_NASM_OPTS} -o build/opusscript_native_nasm.js src/opusscript_encoder.cpp ${OPUS_NATIVE_DIR}/.libs/libopus.a; \
	cp -f opus-native/COPYING build/COPYING.libopus;

"use strict";

let opusscript_native_nasm = require("./build/opusscript_native_nasm.js")();

let ready = false;

Promise.resolve(opusscript_native_nasm).then((mod) => {
	opusscript_native_nasm = mod;
	ready = true;
});

var OpusApplication = {
	VOIP: 2048,
	AUDIO: 2049,
	RESTRICTED_LOWDELAY: 2051,
};

var OpusError = {
	0: "OK",
	"-1": "Bad argument",
	"-2": "Buffer too small",
	"-3": "Internal error",
	"-4": "Invalid packet",
	"-5": "Unimplemented",
	"-6": "Invalid state",
	"-7": "Memory allocation fail",
};
var VALID_SAMPLING_RATES = [8000, 12000, 16000, 24000, 48000];
var MAX_FRAME_SIZE = (48000 * 60) / 1000;
var MAX_PACKET_SIZE = 1276 * 3;

class OpusScriptHandler {
	static __name__ = "_OpusScriptHandler";
	__name__ = "_OpusScriptHandler";
	__pointer__ = null;

	constructor(...args) {
		const methods = ["_encode", "_decode", "_encoder_ctl", "_decoder_ctl"];

		if (ready) {
			this.__pointer__ = opusscript_native_nasm[this.__name__ + "_new"](...args);
		} else
			Promise.resolve(opusscript_native_nasm).then((mod) => {
				this.__pointer__ = mod[this.__name__ + "_new"](...args);
				ready = true;
			});

		methods.forEach((method) => {
			this[method] = (...args) => {
				if (this.__pointer__ === null) throw new Error("asm.js module not ready");
				return opusscript_native_nasm[this.__name__ + "_" + method](this.__pointer__, ...args);
			};
		});
	}

	static destroy_handler(handler) {
		opusscript_native_nasm[this.__name__ + "_static_" + "destroy_handler"](handler.__pointer__);
	}
}

function OpusScript(samplingRate, channels, application, options) {
	if (!~VALID_SAMPLING_RATES.indexOf(samplingRate)) {
		throw new RangeError(`${samplingRate} is an invalid sampling rate.`);
	}
	this.options = options;

	this.samplingRate = samplingRate;
	this.channels = channels || 1;
	this.application = application || OpusApplication.AUDIO;

	let opusscript_native = null;

	opusscript_native = opusscript_native_nasm;
	this.handler = new OpusScriptHandler(this.samplingRate, this.channels, this.application);

	this.inPCMLength = MAX_FRAME_SIZE * this.channels * 2;
	this.inPCMPointer = opusscript_native._malloc(this.inPCMLength);
	this.inPCM = opusscript_native.HEAPU16.subarray(
		this.inPCMPointer,
		this.inPCMPointer + this.inPCMLength
	);

	this.inOpusPointer = opusscript_native._malloc(MAX_PACKET_SIZE);
	this.inOpus = opusscript_native.HEAPU8.subarray(
		this.inOpusPointer,
		this.inOpusPointer + MAX_PACKET_SIZE
	);

	this.outOpusPointer = opusscript_native._malloc(MAX_PACKET_SIZE);
	this.outOpus = opusscript_native.HEAPU8.subarray(
		this.outOpusPointer,
		this.outOpusPointer + MAX_PACKET_SIZE
	);

	this.outPCMLength = MAX_FRAME_SIZE * this.channels * 2;
	this.outPCMPointer = opusscript_native._malloc(this.outPCMLength);
	this.outPCM = opusscript_native.HEAPU16.subarray(
		this.outPCMPointer,
		this.outPCMPointer + this.outPCMLength
	);
}

OpusScript.prototype.encode = function encode(buffer, frameSize) {
	this.inPCM.set(buffer);

	var len = this.handler._encode(
		this.inPCM.byteOffset,
		buffer.length,
		this.outOpusPointer,
		frameSize
	);
	if (len < 0) {
		throw new Error("Encode error: " + OpusError["" + len]);
	}

	return Buffer.from(this.outOpus.subarray(0, len));
};

OpusScript.prototype.decode = function decode(buffer) {
	this.inOpus.set(buffer);

	var len = this.handler._decode(this.inOpusPointer, buffer.length, this.outPCM.byteOffset);
	if (len < 0) {
		throw new Error("Decode error: " + OpusError["" + len]);
	}

	return Buffer.from(this.outPCM.subarray(0, len * this.channels * 2));
};

OpusScript.prototype.encoderCTL = function encoderCTL(ctl, arg) {
	var len = this.handler._encoder_ctl(ctl, arg);
	if (len < 0) {
		throw new Error("Encoder CTL error: " + OpusError["" + len]);
	}
};

OpusScript.prototype.setBitrate = function setBitrate(bitrate) {
	this.encoderCTL(4002, bitrate);
};

OpusScript.prototype.decoderCTL = function decoderCTL(ctl, arg) {
	var len = this.handler._decoder_ctl(ctl, arg);
	if (len < 0) {
		throw new Error("Decoder CTL error: " + OpusError["" + len]);
	}
};

OpusScript.prototype.delete = function del() {
	let opusscript_native = opusscript_native_nasm;
	OpusScriptHandler.destroy_handler(this.handler);
	opusscript_native._free(this.inPCMPointer);
	opusscript_native._free(this.inOpusPointer);
	opusscript_native._free(this.outOpusPointer);
	opusscript_native._free(this.outPCMPointer);
};

OpusScript.Application = OpusApplication;
OpusScript.Error = OpusError;
OpusScript.VALID_SAMPLING_RATES = VALID_SAMPLING_RATES;
OpusScript.MAX_PACKET_SIZE = MAX_PACKET_SIZE;

module.exports = OpusScript;

"use strict";

const utils = require("@iobroker/adapter-core"); // Adapter core module
const net = require("net"); // Node.js net module for TCP connections

class HuaweiCharger extends utils.Adapter {
    constructor(options) {
        super({
            ...options,
            name: "huawei-charger",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));

        this.client = null; // Placeholder for TCP client
        this.reconnectInterval = null;
        this.isConnected = false;
        this.writeCache = []; // Cache for write operations while disconnected
    }

    async onReady() {
        this.setState("info.connection", false, true);
        this.log.info("Connecting to Huawei Charger...");

        this.connectToCharger();
    }

    connectToCharger() {
        const ipAddress = this.config.ipAddress;
        const port = this.config.port || 502; // Default port 502
        const unitId = this.config.unitId || 1; // Default unit ID 1

        if (!ipAddress || !port) {
            this.log.error("IP address or port is not specified. Please check your configuration.");
            return;
        }

        this.client = new net.Socket();

        this.client.connect(port, ipAddress, () => {
            this.isConnected = true;
            this.clearReconnectInterval();
            this.setState("info.connection", true, true);
            this.log.info("Successfully connected to Huawei Charger.");
            this.setupObjects(); // Set up the object tree
            this.processWriteCache(); // Process cached writes
        });

        this.client.on('data', (data) => {
            this.log.debug(`Received data: ${data.toString('hex')}`);
            this.processIncomingData(data);
        });

        this.client.on('error', (err) => {
            this.log.error(`Connection error: ${err.message}`);
            this.isConnected = false;
            this.setState("info.connection", false, true);
            this.scheduleReconnect();
        });

        this.client.on('close', () => {
            if (this.isConnected) {
                this.log.info("Connection to Huawei Charger closed.");
                this.isConnected = false;
                this.setState("info.connection", false, true);
                this.scheduleReconnect();
            }
        });
    }

    scheduleReconnect() {
        if (this.reconnectInterval) return; // Avoid multiple reconnect intervals

        const reconnectInterval = this.config.reconnectInterval || 60000; // Default to 1 minute

        this.reconnectInterval = setInterval(() => {
            if (!this.isConnected) {
                this.log.info("Attempting to reconnect to Huawei Charger...");
                this.connectToCharger();
            }
        }, reconnectInterval);
    }

    clearReconnectInterval() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    // Setup the objects in the ioBroker object tree
    async setupObjects() {
        // Phase L1 Output Voltage
        await this.setObjectNotExistsAsync('charger.phaseL1.voltage', {
            type: 'state',
            common: {
                name: 'Phase L1 Output Voltage',
                type: 'number',
                role: 'value.voltage',
                unit: 'V',
                read: true,
                write: false
            },
            native: {}
        });

        // Phase L2 Output Voltage
        await this.setObjectNotExistsAsync('charger.phaseL2.voltage', {
            type: 'state',
            common: {
                name: 'Phase L2 Output Voltage',
                type: 'number',
                role: 'value.voltage',
                unit: 'V',
                read: true,
                write: false
            },
            native: {}
        });

        // Phase L3 Output Voltage
        await this.setObjectNotExistsAsync('charger.phaseL3.voltage', {
            type: 'state',
            common: {
                name: 'Phase L3 Output Voltage',
                type: 'number',
                role: 'value.voltage',
                unit: 'V',
                read: true,
                write: false
            },
            native: {}
        });

        // Phase L1 Output Current
        await this.setObjectNotExistsAsync('charger.phaseL1.current', {
            type: 'state',
            common: {
                name: 'Phase L1 Output Current',
                type: 'number',
                role: 'value.current',
                unit: 'A',
                read: true,
                write: false
            },
            native: {}
        });

        // Phase L2 Output Current
        await this.setObjectNotExistsAsync('charger.phaseL2.current', {
            type: 'state',
            common: {
                name: 'Phase L2 Output Current',
                type: 'number',
                role: 'value.current',
                unit: 'A',
                read: true,
                write: false
            },
            native: {}
        });

        // Phase L3 Output Current
        await this.setObjectNotExistsAsync('charger.phaseL3.current', {
            type: 'state',
            common: {
                name: 'Phase L3 Output Current',
                type: 'number',
                role: 'value.current',
                unit: 'A',
                read: true,
                write: false
            },
            native: {}
        });

        // Total Output Power
        await this.setObjectNotExistsAsync('charger.totalPower', {
            type: 'state',
            common: {
                name: 'Total Output Power',
                type: 'number',
                role: 'value.power',
                unit: 'kW',
                read: true,
                write: false
            },
            native: {}
        });

        // Combined Voltage of all Phases
        await this.setObjectNotExistsAsync('charger.combined.voltage', {
            type: 'state',
            common: {
                name: 'Combined Voltage (average)',
                type: 'number',
                role: 'value.voltage',
                unit: 'V',
                read: true,
                write: false
            },
            native: {}
        });

        // Combined Current of all Phases
        await this.setObjectNotExistsAsync('charger.combined.current', {
            type: 'state',
            common: {
                name: 'Combined Current (L1 + L2 + L3)',
                type: 'number',
                role: 'value.current',
                unit: 'A',
                read: true,
                write: false
            },
            native: {}
        });

        // Max Charging Power (writable)
        await this.setObjectNotExistsAsync('charger.maxChargingPower', {
            type: 'state',
            common: {
                name: 'Max Charging Power',
                type: 'number',
                role: 'level',
                unit: 'kW',
                min: 0,
                max: 22,
                def: 22,
                read: true,
                write: true
            },
            native: {}
        });

        // Charging Control (writable with selection)
        await this.setObjectNotExistsAsync('charger.chargingControl', {
            type: 'state',
            common: {
                name: 'Charging Control',
                type: 'number',
                role: 'state',
                states: {
                    0: 'Standby',
                    1: 'Paused',
                    2: 'Charging'
                },
                def: 0,
                read: true,
                write: true
            },
            native: {}
        });
    }

    // Process incoming data and update corresponding objects
    processIncomingData(data) {
		try {
			const functionCode = data.readUInt8(7);
			const registerData = data.slice(8);
	
			if (functionCode === 3) { // Read Holding Registers
				const phaseL1Voltage = registerData.length >= 4 ? Math.round((registerData.readUInt32BE(0) / 10000000) * 100) / 100 : 0;
				const phaseL2Voltage = registerData.length >= 8 ? Math.round((registerData.readUInt32BE(4) / 10000000) * 100) / 100 : 0;
				const phaseL3Voltage = registerData.length >= 12 ? Math.round((registerData.readUInt32BE(8) / 10000000) * 100) / 100 : 0;
				const phaseL1Current = registerData.length >= 16 ? Math.round((registerData.readUInt32BE(12) / 10) * 100) / 100 : 0;
				const phaseL2Current = registerData.length >= 20 ? Math.round((registerData.readUInt32BE(16) / 10) * 100) / 100 : 0;
				const phaseL3Current = registerData.length >= 24 ? Math.round((registerData.readUInt32BE(20) / 10) * 100) / 100 : 0;
				const totalPower = registerData.length >= 28 ? Math.round((registerData.readUInt32BE(24) / 10) * 100) / 100 : 0;
	
				let combinedVoltageSum = 0;
				let combinedVoltageCount = 0;
	
				if (phaseL1Voltage > 0) {
					combinedVoltageSum += phaseL1Voltage;
					combinedVoltageCount++;
				}
				if (phaseL2Voltage > 0) {
					combinedVoltageSum += phaseL2Voltage;
					combinedVoltageCount++;
				}
				if (phaseL3Voltage > 0) {
					combinedVoltageSum += phaseL3Voltage;
					combinedVoltageCount++;
				}
	
				const combinedVoltage = combinedVoltageCount > 0 ? Math.round((combinedVoltageSum / combinedVoltageCount) * 100) / 100 : 0;
				const combinedCurrent = Math.round((phaseL1Current + phaseL2Current + phaseL3Current) * 100) / 100;
	
				this.setStateAsync('charger.phaseL1.voltage', { val: phaseL1Voltage, ack: true });
				this.setStateAsync('charger.phaseL2.voltage', { val: phaseL2Voltage, ack: true });
				this.setStateAsync('charger.phaseL3.voltage', { val: phaseL3Voltage, ack: true });
				this.setStateAsync('charger.phaseL1.current', { val: phaseL1Current, ack: true });
				this.setStateAsync('charger.phaseL2.current', { val: phaseL2Current, ack: true });
				this.setStateAsync('charger.phaseL3.current', { val: phaseL3Current, ack: true });
				this.setStateAsync('charger.totalPower', { val: totalPower, ack: true });
				this.setStateAsync('charger.combined.voltage', { val: combinedVoltage, ack: true });
				this.setStateAsync('charger.combined.current', { val: combinedCurrent, ack: true });
			}
		} catch (error) {
			this.log.error(`Failed to process incoming data: ${error.message}`);
		}
	}
	

    // Handle state changes
    onStateChange(id, state) {
        if (state && !state.ack) {
            this.log.info(`State ${id} changed: ${state.val}`);

            if (id === `${this.namespace}.charger.maxChargingPower`) {
                const maxChargingPower = state.val * 10; // Convert to correct format for sending
                this.writeToCharger(8192, maxChargingPower);
            } else if (id === `${this.namespace}.charger.chargingControl`) {
                const chargingControl = state.val;
                this.writeToCharger(8198, chargingControl);
            }
        }
    }

    // Write data to the charger
    writeToCharger(register, value) {
        if (this.client && this.isConnected) {
            const buffer = Buffer.alloc(6);
            buffer.writeUInt16BE(register, 0);
            buffer.writeUInt32BE(value, 2);

            this.client.write(buffer, () => {
                this.log.info(`Wrote value ${value} to register ${register}`);
            });
        } else {
            this.log.warn("Cannot write to charger, not connected.");
            this.writeCache.push({ register, value });
        }
    }

    processWriteCache() {
        if (this.writeCache.length > 0 && this.isConnected) {
            this.log.info("Processing cached write operations...");
            this.writeCache.forEach(entry => {
                this.writeToCharger(entry.register, entry.value);
            });
            this.writeCache = []; // Clear cache after processing
        }
    }

    onUnload(callback) {
        try {
            if (this.client) {
                this.client.destroy();
            }
            this.clearReconnectInterval();
            this.log.info("Connection to Huawei Charger closed.");
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new HuaweiCharger(options);
} else {
    new HuaweiCharger();
}

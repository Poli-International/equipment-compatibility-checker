window.PoliTools = window.PoliTools || {};
window.PoliTools.EquipmentCompatibility = window.PoliTools.EquipmentCompatibility || {};

window.PoliTools.EquipmentCompatibility.checkCompatibility = function(item1, item2, type1, type2) {
    let machine, power, cartridge, grip;

    if (type1 === 'machine') machine = item1;
    if (type2 === 'machine') machine = item2;
    if (type1 === 'power') power = item1;
    if (type2 === 'power') power = item2;
    if (type1 === 'cartridge') cartridge = item1;
    if (type2 === 'cartridge') cartridge = item2;
    if (type1 === 'grip') grip = item1;
    if (type2 === 'grip') grip = item2;

    const result = {
        status: 'compatible',
        notes: [],
    };

    const addNote = (note, status) => {
        result.notes.push(note);
        if (status === 'incompatible') {
            result.status = 'incompatible';
        } else if (status === 'conditional' && result.status !== 'incompatible') {
            result.status = 'conditional';
        }
    };
    
    // Machine <-> Power Supply
    if (machine && power) {
        if (machine.connection_type === 'wireless') {
             addNote('Wireless machines like the ' + machine.model + ' do not need an external power supply.', 'conditional');
        } else if (power.connection_types.includes(machine.connection_type)) {
            result.notes.push(`✅ Connection match: ${machine.connection_type.toUpperCase()} connection is compatible.`);
        } else if (power.connection_types.includes('wireless_rca') && machine.connection_type === 'RCA') {
            result.notes.push(`✅ Connection match: Wireless battery pack fits the ${machine.connection_type.toUpperCase()} port.`);
        } else {
            addNote(`❌ Connection mismatch: Machine requires ${machine.connection_type.toUpperCase()} but power supply provides ${power.connection_types.join(' or ').toUpperCase()}. An adapter may be required.`, 'conditional');
        }
        
        if (machine.type === 'coil' && parseFloat(power.output_amperage) < 3) {
            addNote(`⚠️ Low Amperage: This power supply has a ${power.output_amperage} max output. Coil machines often perform better with 3A or more, especially for large needle groupings.`, 'conditional');
        }
    }

    // Machine <-> Cartridge/Needle
    if (machine && cartridge) {
        if (machine.cartridge_compatibility.includes('universal') && cartridge.universal_fit) {
            result.notes.push('✅ Cartridge Fit: This machine accepts universal cartridges.');
        } else if (machine.cartridge_compatibility.includes('standard_needle') && cartridge.compatible_machines.includes('standard_needle')) {
            result.notes.push('✅ Needle Fit: This coil machine works with standard needles-on-bar.');
        } else if (machine.cartridge_compatibility.includes('cheyenne') && cartridge.compatible_machines.includes('cheyenne')) {
            result.notes.push('✅ Cartridge Fit: Cheyenne machine is compatible with Cheyenne cartridges.');
        } else {
            addNote(`❌ Cartridge Mismatch: This machine may not be compatible with this type of cartridge. Check manufacturer specifications.`, 'incompatible');
        }
        
        if (cartridge.membrane_type === 'none') {
            addNote(`⚠️ Safety Warning: This cartridge has no safety membrane. Using it can lead to ink and blood backflow, voiding machine warranty and posing a cross-contamination risk.`, 'conditional');
        } else if (cartridge.membrane_type === 'partial_or_none') {
             addNote(`⚠️ Safety Warning: This cartridge may not have a reliable safety membrane. This can lead to ink/blood backflow. Use with caution.`, 'conditional');
        }
    }
    
    // Machine <-> Grip
    if (machine && grip) {
        if (grip.grip_type === 'cartridge' && machine.type !== 'coil') {
             result.notes.push('✅ Grip Type: Cartridge grip is compatible with this pen/rotary machine.');
        } else if (grip.grip_type === 'standard_needle' && machine.type === 'coil') {
             result.notes.push('✅ Grip Type: Standard needle grip is compatible with this coil machine.');
        } else {
             addNote(`❌ Grip Mismatch: A ${grip.grip_type.replace('_', ' ')} grip is not compatible with a ${machine.type} machine.`, 'incompatible');
        }
    }

    if(result.notes.length === 0) {
        addNote('These two components do not have a direct compatibility relationship to check.', 'conditional');
    }

    if (result.status === 'compatible' && result.notes.length > 0) {
        const hasCheck = result.notes.some(n => n.startsWith('✅'));
        if (hasCheck) {
            result.notes.unshift("✅ Fully Compatible: These components are designed to work together.");
        }
    }

    return result;
}

window.PoliTools.EquipmentCompatibility.findCompatible = function(item, itemType, databases) {
    const compatible = {
        power: [],
        cartridge: [],
        grip: [],
        machine: [],
    };

    if (itemType === 'machine') {
        // Find power supplies
        databases.power.forEach(power => {
            if (item.connection_type === 'wireless') return;
            let reason = null;
            if (power.connection_types.includes(item.connection_type)) {
                reason = `Matches ${item.connection_type.toUpperCase()} connection`;
            } else if (item.connection_type === 'RCA' && power.connection_types.includes('wireless_rca')) {
                reason = `Wireless pack for RCA connection`;
            }
            if(reason) {
                compatible.power.push({...power, compatReason: reason});
            }
        });
        // Find cartridges
        databases.cartridge.forEach(cartridge => {
            let reason = null;
            if(item.cartridge_compatibility.includes('universal') && cartridge.universal_fit) {
                reason = 'Accepts universal cartridges';
            } else if(item.cartridge_compatibility.includes('cheyenne') && cartridge.compatible_machines.includes('cheyenne')) {
                reason = 'Accepts Cheyenne cartridges';
            } else if(item.cartridge_compatibility.includes('standard_needle') && cartridge.compatible_machines.includes('standard_needle')) {
                reason = 'Accepts standard needles';
            }
            if(reason) {
                 compatible.cartridge.push({...cartridge, compatReason: reason});
            }
        });
    } else if (itemType === 'power') {
        // Find machines
         databases.machine.forEach(machine => {
            if (machine.connection_type === 'wireless') return;
            let reason = null;
            if (item.connection_types.includes(machine.connection_type)) {
                reason = `Provides ${machine.connection_type.toUpperCase()} connection`;
            } else if (machine.connection_type === 'RCA' && item.connection_types.includes('wireless_rca')) {
                reason = `Fits ${machine.connection_type.toUpperCase()} connection`;
            }
            if(reason) {
                compatible.machine.push({...machine, compatReason: reason});
            }
        });
    }
    
    return compatible;
}

window.PoliTools.EquipmentCompatibility.checkFullSetup = function(machine, power, cartridge, grip) {
    const results = [];
    results.push(window.PoliTools.EquipmentCompatibility.checkCompatibility(machine, power, 'machine', 'power'));
    results.push(window.PoliTools.EquipmentCompatibility.checkCompatibility(machine, cartridge, 'machine', 'cartridge'));
    results.push(window.PoliTools.EquipmentCompatibility.checkCompatibility(machine, grip, 'machine', 'grip'));

    const finalResult = {
        status: 'compatible',
        notes: [],
        cost: ''
    };

    const priceMap = {
        '$': [15, 80], // Combined range for cheap items
        '$$': [100, 250],
        '$$$': [250, 450],
        '$$$$': [450, 700],
        '$$$$$': [700, 1100]
    };
    
    let minCost = 0;
    let maxCost = 0;

    [machine, power, cartridge, grip].forEach(item => {
        if(item && item.price_range) {
            const range = priceMap[item.price_range];
            if(range) {
                minCost += range[0];
                maxCost += range[1];
            }
        }
    });

    finalResult.cost = `$${minCost} - $${maxCost}`;

    results.forEach(res => {
        // Aggregate notes
        res.notes.forEach(note => {
            // Avoid duplicate "Fully Compatible" messages
            if (note.startsWith("✅ Fully Compatible")) return;
            finalResult.notes.push(note);
        });

        // Determine overall status
        if (res.status === 'incompatible') {
            finalResult.status = 'incompatible';
        } else if (res.status === 'conditional' && finalResult.status !== 'incompatible') {
            finalResult.status = 'conditional';
        }
    });
    
    return finalResult;
};
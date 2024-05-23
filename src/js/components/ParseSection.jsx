import {useState, useEffect, useContext} from 'react';
import PropTypes from 'prop-types';
import * as joobyCodec from 'jooby-codec';
import {frameTypes} from 'jooby-codec/mtx/constants/index.js';
import {v4 as uuidv4} from 'uuid';
import {
    Box,
    Typography,
    InputAdornment,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormLabel
} from '@mui/material';

import {
    Clear as ClearIcon
} from '@mui/icons-material';

import removeComments from '../utils/removeComments.js';

import {useSnackbar} from '../contexts/SnackbarContext.jsx';
import {CommandTypeContext} from '../contexts/CommandTypeContext.jsx';

import IconButtonWithTooltip from './IconButtonWithTooltip.jsx';
import TextField from './TextField.jsx';
import Button from './Button.jsx';

import {commands} from '../joobyCodec.js';
import {
    SEVERITY_TYPE_WARNING,
    COMMAND_TYPE_ANALOG,
    COMMAND_TYPE_MTX,
    COMMAND_TYPE_OBIS_OBSERVER,
    ACCESS_KEY_LENGTH_BYTES,
    DEFAULT_ACCESS_KEY,
    UNKNOWN_COMMAND_NAME,
    directionNames,
    directions
} from '../constants.js';

import getHardwareType from '../utils/getHardwareType.js';
import getHardwareTypeName from '../utils/getHardwareTypeName.js';
import createCtrlEnterSubmitHandler from '../utils/createCtrlEnterSubmitHandler.js';
import isValidHex from '../utils/isValidHex.js';
import getLogType from '../utils/getLogType.js';
import isByteArray from '../utils/isByteArray.js';


const base64ToHex = base64 => Array.from(atob(base64), char => char.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');

const validators = {
    accessKey: hex => isValidHex(hex, ACCESS_KEY_LENGTH_BYTES)
};

const formats = {
    HEX: '0',
    BASE64: '1'
};

const defaults = {
    accessKey: DEFAULT_ACCESS_KEY
};

const parametersState = {
    direction: directions.DOWNLINK,
    accessKey: defaults.accessKey
};

const parameterErrorsState = {
    accessKey: false
};

const obisObserverDownlinkCommandIds = Object.values(joobyCodec.obisObserver.commands.downlink).map(command => command.id);


const ParseSection = ( {setLogs, hardwareType} ) => {
    const {commandType} = useContext(CommandTypeContext);

    const [dump, setDump] = useState('');
    const [format, setFormat] = useState(formats.HEX);
    const [parameters, setParameters] = useState({...parametersState});
    const [parameterErrors, setParameterErrors] = useState({...parameterErrorsState});

    const showSnackbar = useSnackbar();

    // reset state when command type changes
    useEffect(
        () => {
            setDump('');
            setParameters({...parametersState});
            setParameterErrors({...parameterErrorsState});
        },
        [commandType]
    );

    const onFormatChange = event => {
        setFormat(event.target.value);
    };

    const onDumpChange = event => {
        setDump(event.target.value);
    };

    const onClearDumpClick = () => {
        setDump('');
    };

    const onParseClick = () => {
        if ( !dump || Object.values(parameterErrors).some(error => error) ) {
            return;
        }

        const preparedData = {};
        let hex = dump;
        let data;
        let parseError;
        let direction;

        if ( format === formats.BASE64 ) {
            try {
                hex = base64ToHex(dump);
            } catch ( error ) {
                parseError = error;
            }
        } else {
            hex = removeComments(dump);
        }

        if ( !parseError ) {
            const bytes = joobyCodec.utils.getBytesFromHex(hex);
            const codec = joobyCodec[commandType];

            switch ( commandType ) {
                case COMMAND_TYPE_MTX: {
                    const aesKey = joobyCodec.utils.getBytesFromHex(parameters.accessKey);

                    try {
                        direction = directions.DOWNLINK;
                        data = codec.message[directionNames[direction]].fromFrame(bytes, {aesKey});
                    } catch ( error ) {
                        parseError = error;
                    }

                    if ( parseError || data.type !== frameTypes.DATA_REQUEST ) {
                        parseError = null;
                        data = null;

                        try {
                            direction = directions.UPLINK;
                            data = codec.message[directionNames[direction]].fromFrame(bytes, {aesKey});
                        } catch ( error ) {
                            parseError = error;
                        }
                    }

                    break;
                }

                case COMMAND_TYPE_ANALOG:
                    try {
                        direction = Number(parameters.direction);
                        data = codec.message[directionNames[direction]].fromBytes(
                            bytes,
                            {hardwareType: getHardwareType(hardwareType)}
                        );
                    } catch ( error ) {
                        parseError = error;
                    }

                    break;

                case COMMAND_TYPE_OBIS_OBSERVER:
                    try {
                        direction = directions.DOWNLINK;
                        data = codec.message[directionNames[direction]].fromBytes(bytes);
                    } catch ( error ) {
                        parseError = error;
                    }

                    if (
                        parseError
                        || !data.commands
                            .map(({error, command, id}) => (error ? command.id : id))
                            .some(id => obisObserverDownlinkCommandIds.includes(id))
                    ) {
                        parseError = null;
                        data = null;

                        try {
                            direction = directions.UPLINK;
                            data = codec.message[directionNames[direction]].fromBytes(bytes);
                        } catch ( error ) {
                            parseError = error;
                        }
                    }

                    break;
            }
        }

        if ( data && !parseError ) {
            const messageError = data.error;
            const message = messageError ? data.message : data;

            preparedData.commands = message.commands.map(commandData => {
                const {error} = commandData;
                const command = error ? commandData.command : commandData;
                const commandDetails = error ? null : commands[commandType][directionNames[direction]][command.name];
                const isByteArrayValid = isByteArray(command.bytes);

                return {
                    command: {
                        error,
                        id: command.id,
                        name: command.name || UNKNOWN_COMMAND_NAME,
                        hex: isByteArrayValid ? joobyCodec.utils.getHexFromBytes(command.bytes) : undefined,
                        length: isByteArrayValid ? command.bytes.length : undefined,
                        directionType: direction,
                        hasParameters: error ? undefined : commandDetails.hasParameters,
                        parameters: command.parameters || undefined
                    },
                    id: uuidv4(),
                    isExpanded: false
                };
            });

            preparedData.lrc = message.lrc;
            preparedData.error = messageError;
        }

        const logType = getLogType(commandType, parseError);

        const log = {
            commandType,
            hex,
            hardwareType: getHardwareTypeName(hardwareType),
            data: parseError ? undefined : preparedData,
            date: new Date().toLocaleString(),
            error: parseError?.message,
            type: logType,
            id: uuidv4(),
            isExpanded: false,
            tags: ['parse', commandType, logType]
        };

        if ( commandType === COMMAND_TYPE_MTX && !parseError ) {
            log.frameParameters = {
                type: data.type,
                destination: data.destination,
                source: data.source,
                accessLevel: data.error ? data.message.accessLevel : data.accessLevel,
                messageId: data.error ? data.message.messageId : data.messageId
            };
        }

        setLogs(prevLogs => [log, ...prevLogs]);
    };

    const onControlBlur = event => {
        const {name, value} = event.target;

        if ( value.trim() === '' && name in defaults ) {
            setParameters(prevParameters => ({
                ...prevParameters,
                [name]: defaults[name]
            }));

            setParameterErrors(prevParameterErrors => ({
                ...prevParameterErrors,
                [name]: false
            }));

            showSnackbar({
                message: `"${name}" set to default of "${defaults[name]}".`,
                severity: SEVERITY_TYPE_WARNING
            });

            return;
        }

        if ( validators[name] ) {
            setParameterErrors(prevParameterErrors => ({
                ...prevParameterErrors,
                [name]: !validators[name](value)
            }));
        }
    };

    const onControlChange = event => {
        const {name, value} = event.target;

        setParameters(prevParameters => ({
            ...prevParameters,
            [name]: value
        }));
    };

    return (
        <>
            <Typography variant="h5">
                {
                    commandType === COMMAND_TYPE_MTX
                        ? 'Parse frame'
                        : 'Parse message'
                }
            </Typography>

            <div>
                <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', alignItems: 'center'}}>
                    <FormControl sx={{display: 'contents'}}>
                        <FormLabel id="dump-input-format" sx={{pr: 2}}>Format</FormLabel>
                        <RadioGroup
                            row
                            aria-label="dump-input-format"
                            name="format"
                            value={format}
                            onChange={onFormatChange}
                            sx={{display: 'contents'}}
                        >
                            <FormControlLabel value={formats.HEX} control={<Radio/>} label="hex"/>
                            <FormControlLabel value={formats.BASE64} control={<Radio/>} label="base64"/>
                        </RadioGroup>
                    </FormControl>

                    {commandType === COMMAND_TYPE_ANALOG && (
                        <FormControl sx={{display: 'contents'}}>
                            <FormLabel id="dump-input-direction" sx={{pr: 2}}>Direction</FormLabel>
                            <RadioGroup
                                row
                                aria-label="dump-input-direction"
                                name="direction"
                                value={parameters.direction}
                                onChange={onControlChange}
                                sx={{display: 'contents'}}
                            >
                                <FormControlLabel value={directions.DOWNLINK} control={<Radio/>} label={directionNames[directions.DOWNLINK]}/>
                                <FormControlLabel value={directions.UPLINK} control={<Radio/>} label={directionNames[directions.UPLINK]}/>
                            </RadioGroup>
                        </FormControl>
                    )}
                </Box>
            </div>

            {commandType === COMMAND_TYPE_MTX && (
                <div>
                    <TextField
                        type="text"
                        label="Access key"
                        value={parameters.accessKey}
                        error={parameterErrors.accessKey}
                        name="accessKey"
                        helperText="16-byte in hex format"
                        onChange={onControlChange}
                        onBlur={onControlBlur}
                    />
                </div>
            )}

            <div>
                <TextField
                    type="text"
                    label="Dump"
                    onChange={onDumpChange}
                    onKeyDown={createCtrlEnterSubmitHandler(onParseClick)}
                    multiline
                    minRows={1}
                    maxRows={12}
                    value={dump}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                {dump && (
                                    <IconButtonWithTooltip title="Clear dump" onClick={onClearDumpClick}>
                                        <ClearIcon/>
                                    </IconButtonWithTooltip>
                                )}
                            </InputAdornment>
                        )
                    }}
                />
            </div>

            <div>
                <Button
                    fullWidth={true}
                    sx={{mb: 2}}
                    disabled={!dump || Object.values(parameterErrors).some(error => error)}
                    onClick={onParseClick}
                >
                    Parse
                </Button>
            </div>
        </>
    );
};

ParseSection.propTypes = {
    setLogs: PropTypes.func.isRequired,
    hardwareType: PropTypes.object
};


export default ParseSection;

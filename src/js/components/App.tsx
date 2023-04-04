import {Fragment, useState, useEffect, useRef} from 'react';
import {v4 as uuidv4} from 'uuid';
import {JSONTree} from 'react-json-tree';
import {commands, message} from 'dpc';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, {SelectChangeEvent} from '@mui/material/Select';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilledInput from '@mui/material/FilledInput';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuList from '@mui/material/MenuList';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import DeleteIcon from '@mui/icons-material/Delete';
import ListItemText from '@mui/material/ListItemText';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';


console.log('commands', commands);
console.log('message', message);

const JSONTreeTheme = {
    scheme: 'bright',
    author: 'http://chriskempson.com',
    base00: '#000000',
    base01: '#303030',
    base02: '#505050',
    base03: '#b0b0b0',
    base04: '#d0d0d0',
    base05: '#e0e0e0',
    base06: '#f5f5f5',
    base07: '#ffffff',
    base08: '#fb0120',
    base09: '#fc6d24',
    base0A: '#fda331',
    base0B: '#a1c659',
    base0C: '#76c7b7',
    base0D: '#6fb3d2',
    base0E: '#d381c3',
    base0F: '#be643c',
    tree: {
        margin: 0
    }
};

const DIRECTION_UPLINK = 'uplink';
const DIRECTION_DOWNLINK = 'downlink';

const LOG_TYPE_ERROR = 'error';
const LOG_TYPE_MESSAGE = 'message';
const LOG_TYPE_COMMAND = 'command';

// const PARSE_BUTTON_DIRECTION_AUTO_INDEX = 0;
// const PARSE_BUTTON_DIRECTION_UPLINK_INDEX = 1;
// const PARSE_BUTTON_DIRECTION_DOWNLINK_INDEX = 2;

const parseButtonNameMap = {
    [message.TYPE_AUTO]: 'Parse (auto)',
    [message.TYPE_UPLINK]: 'Parse (uplink)',
    [message.TYPE_DOWNLINK]: 'Parse (downlink)'
} as const;

const preparedCommandList = [...Object.values(commands.uplink), ...Object.values(commands.downlink)]
    .map(item => ({
        label: item.title,
        value: item,
        direction: item.isUplink ? DIRECTION_UPLINK : DIRECTION_DOWNLINK
    }));

type Direction = typeof DIRECTION_UPLINK | typeof DIRECTION_DOWNLINK | '';
type LogType = typeof LOG_TYPE_ERROR | typeof LOG_TYPE_MESSAGE | typeof LOG_TYPE_COMMAND;
// type ParseButtonDirection = typeof PARSE_BUTTON_DIRECTION_AUTO_INDEX
//     | typeof PARSE_BUTTON_DIRECTION_UPLINK_INDEX
//     | typeof PARSE_BUTTON_DIRECTION_DOWNLINK_INDEX;

interface ILog {
    // direction: Direction;
    buffer: string;
    data: Array<object> | null;
    date: Date;
    error?: unknown;
    type: LogType;
}

interface BoldTextProps {
    children: string;
}


const BoldText = ({children}: BoldTextProps) => (
    <Box component="span" sx={{fontWeight: 'fontWeightMedium'}}>
        {children}
    </Box>
);


const getSubLogArrowIcon = (isUplink: boolean) => {
    if (isUplink) {
        return <ArrowRightAltIcon sx={{mr: 3, transform: 'rotate(180deg)'}} />;
    }

    return <ArrowRightAltIcon sx={{mr: 3}} />;
};

const isAllCommandsHaveSameDirection = (logCommands: Array<object>) => (
    logCommands.every((logCommand, index, array) => logCommand.command.constructor.isUplink === array[0].command.constructor.isUplink)
);

const getLogArrowIcon = (logCommands: Array<object>) => {
    // commands have a different direction in the message
    if (!isAllCommandsHaveSameDirection(logCommands)) {
        return <CompareArrowsIcon sx={{mr: 3}} />;
    }

    return getSubLogArrowIcon(logCommands[0].command.constructor.isUplink);
};

const getLogTitle = (log: ILog) => (
    <>
        {getLogArrowIcon(log.data.commands)}
        <Box>
            LRC expected: <BoldText>{decimalToHex(log.data.lrc.expected)}</BoldText>, actual:{' '}
            <BoldText>{decimalToHex(log.data.lrc.actual)}</BoldText>; commands:{' '}
            <BoldText>{log.data.commands.length}</BoldText>
        </Box>
    </>
);

const getSubLogTitle = (commandData) => (
    <>
        {getSubLogArrowIcon(commandData.command.constructor.isUplink)}
        <Box>
            id: <BoldText>{decimalToHex(commandData.command.constructor.id)}</BoldText>; name:{' '}
            <BoldText>{commandData.command.constructor.title}</BoldText>; size:{' '}
            <BoldText>{commandData.command.toBytes().length}</BoldText>
        </Box>
    </>
);

const decimalToHex = (decimal: number, prefix = '0x') => {
    const hex = decimal.toString(16);

    return `${prefix}${hex.length % 2 ? '0' : ''}${hex}`;
};

const resolveSubLogColor = (logCommand): string => {
    if (logCommand.command.constructor.isUplink) {
        return 'warning.light';
    }

    return 'success.light';
};

const resolveLogColor = (log: ILog): string => {
    if (log.type === LOG_TYPE_ERROR) {
        return 'error.light';
    }

    if (!isAllCommandsHaveSameDirection(log.data.commands)) {
        return 'grey.200';
    }

    return resolveSubLogColor(log.data.commands[0]);
};

const renderLog = (log: ILog, expandedLog: string | false, expandedCommandLog: string | false, handleLogClick, handleCommandLogClick) => {
    const {buffer, data, date, error, type} = log;

    switch (type) {
        case LOG_TYPE_ERROR:
            return (
                <Accordion
                    sx={{overflow: 'hidden'}}
                    key={date.getTime()}
                    expanded={expandedLog === `panel${date.getTime()}`}
                    onChange={handleLogClick(`panel${date.getTime()}`)}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel${date.getTime()}bh-content`}
                        sx={{alignItems: 'center', backgroundColor: `${resolveLogColor(log)}`}}
                    >
                        <Typography sx={{width: '33%', flexShrink: 0}}>Error</Typography>
                        <Typography sx={{color: 'grey.500', ml: 'auto', mr: 2}}>{date.toLocaleString()}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="h6" gutterBottom>Buffer</Typography>
                        <Typography sx={{mb: 2}}>{buffer}</Typography>
                        <Typography variant="h6" gutterBottom>Details</Typography>
                        <Box>{error.message}</Box>
                    </AccordionDetails>
                </Accordion>
            );

        case LOG_TYPE_MESSAGE: {
            // const title = data.commands.map((commandData) => commandData.command.constructor.getName()).join(', ');

            return (
                <Accordion
                    sx={{overflow: 'hidden'}}
                    key={date.getTime()}
                    expanded={expandedLog === `panel${date.getTime()}`}
                    onChange={handleLogClick(`panel${date.getTime()}`)}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel${date.getTime()}bh-content`}
                        sx={{alignItems: 'center', backgroundColor: `${resolveLogColor(log)}`}}
                    >
                        <Typography sx={{flexShrink: 1, display: 'flex', alignItems: 'center'}}>{getLogTitle(log)}</Typography>
                        <Typography sx={{color: 'grey.500', ml: 'auto', mr: 2, flexBasis: 'auto', flexShrink: 0, flexGrow: 0}}>{date.toLocaleString()}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="h6" gutterBottom>Buffer</Typography>
                        <Typography sx={{mb: 2}}>{buffer}</Typography>

                        {data.commands.length > 0 && data.commands.map((commandData: object, index: number) => (
                            <Accordion
                                sx={{overflow: 'hidden'}}
                                key={index}
                                expanded={expandedCommandLog === `panel${date.getTime()}${index}`}
                                onChange={handleCommandLogClick(`panel${date.getTime()}${index}`)}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    aria-controls={`panel${date.getTime()}${index}bh-content`}
                                    sx={{alignItems: 'center', backgroundColor: `${resolveSubLogColor(commandData)}`}}
                                >
                                    <Typography sx={{flexShrink: 1, display: 'flex', alignItems: 'center'}}>{getSubLogTitle(commandData)}</Typography>
                                    {/* <Typography sx={{color: 'grey.500', ml: 'auto', mr: 2, flexBasis: 'auto', flexShrink: 0, flexGrow: 0}}>{date.toLocaleString()}</Typography> */}
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography variant="h6" gutterBottom>Buffer</Typography>
                                    <Typography sx={{mb: 2}}>{commandData.command.toHex()}</Typography>
                                    <Typography variant="h6" gutterBottom>Parameters</Typography>
                                    <Box sx={{mb: 2}}>
                                        <JSONTree
                                            data={commandData.command.getParameters()}
                                            theme={JSONTreeTheme}
                                            invertTheme={true}
                                            hideRoot={true}
                                            shouldExpandNodeInitially={() => true}
                                        />
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                        {/* {data.commands.length > 0 && data.commands.map((commandData: object, index: number) => (
                            <Fragment key={index}>
                                <Typography variant="h6" gutterBottom>Command</Typography>
                                <Typography sx={{mb: 2}}>{commandData.command.constructor.getName()}</Typography>
                                <Box sx={{pl: 4}}>
                                    <Typography variant="h6" gutterBottom>Buffer</Typography>
                                    <Box sx={{pl: 4}}>
                                        <Typography variant="subtitle2" gutterBottom>Hex</Typography>
                                        <Typography sx={{mb: 2}}>{commandData.command.toHex()}</Typography>
                                        <Typography variant='subtitle2' gutterBottom>Binary</Typography>
                                        <Typography sx={{mb: 2}}>{commandData.command.toBinary()}</Typography>
                                    </Box>
                                    <Typography variant="h6" gutterBottom>Parameters</Typography>
                                    <Box sx={{pl: 4}}>
                                        <Typography variant="subtitle2" gutterBottom>JSON (string)</Typography>
                                        <Typography sx={{mb: 2}}>{commandData.command.toJson()}</Typography>
                                        <Typography variant="subtitle2" gutterBottom>JSON (tree)</Typography>
                                        <Box sx={{mb: 2}}>
                                            <JSONTree
                                                data={commandData.command.getParameters()}
                                                theme={JSONTreeTheme}
                                                invertTheme={true}
                                                hideRoot={true}
                                                shouldExpandNodeInitially={() => true}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            </Fragment>
                        ))} */}


                    </AccordionDetails>
                </Accordion>
            );
        }

        case LOG_TYPE_COMMAND:
            return (
                <Accordion
                    sx={{overflow: 'hidden'}}
                    key={date.getTime()}
                    expanded={expandedLog === `panel${date.getTime()}`}
                    onChange={handleLogClick(`panel${date.getTime()}`)}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel${date.getTime()}bh-content`}
                        sx={{alignItems: 'center', backgroundColor: `${resolveLogColor(log)}`}}
                    >
                        <Typography sx={{width: '33%', flexShrink: 0}}>{data.constructor.getName()}</Typography>
                        <Typography sx={{color: 'grey.500', ml: 'auto', mr: 2}}>{date.toLocaleString()}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="h6" gutterBottom>Buffer</Typography>
                        <Typography sx={{mb: 2}}>{buffer}</Typography>
                        <Typography variant="h6" gutterBottom>Parameters</Typography>
                        <JSONTree data={data} theme={JSONTreeTheme} invertTheme={true} hideRoot={true} shouldExpandNodeInitially={() => true} />
                    </AccordionDetails>
                </Accordion>
            );
    }
};


const App = () => {
    // const [device, setDevice] = useState<string | null>(null);
    // const [direction, setDirection] = useState<Direction>('');
    const [buffer, setBuffer] = useState('');
    const [expandedLog, setExpandedLog] = useState<string | false>(false);
    const [expandedCommandLog, setExpandedCommandLog] = useState<string | false>(false);
    const [logs, setLogs] = useState<Array<ILog>>([]);
    const [commandList, setCommandList] = useState<Array<object>>([]);
    const [command, setCommand] = useState<object | null>(null);
    const [parameters, setParameters] = useState<string>('');
    // const [errors, setErrors] = useState<Array<string>>([]);
    const [isOpenParseButtonGroup, setIsOpenParseButtonGroup] = useState<boolean>(false);
    const [selectedParseButtonIndex, setSelectedParseButtonIndex] = useState(message.TYPE_AUTO);
    const [popperWidth, setPopperWidth] = useState<number>(0);
    const [preparedCommands, setPreparedCommands] = useState<Array<object>>([]);

    const anchorButtonGroupListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCommandList(preparedCommandList);
    }, []);

    useEffect(() => {
        if (anchorButtonGroupListRef.current) {
            setPopperWidth(anchorButtonGroupListRef.current.offsetWidth);
        }
    }, [isOpenParseButtonGroup, anchorButtonGroupListRef]);

    // const handleDirectionChange = (event: SelectChangeEvent) => {
    //     setDirection(event.target.value);

    //     const dpcDevice = dpc.gas;

    //     const dpcCommandsByDirection = {
    //         [DIRECTION_UPLINK]: commands.uplink,
    //         [DIRECTION_DOWNLINK]: commands.downlink
    //     };

    //     const dpcCommands = dpcCommandsByDirection[event.target.value as keyof typeof dpcCommandsByDirection];
    //     const dpcCommands = [...Object.values(commands.uplink), ...Object.values(commands.downlink)];
    //     console.log(dpcCommands, 'dpcCommands');


    //     setCommandsByDirection(Object.entries(dpcCommands).map(([commandName, commandData]) => ({label: commandData[commandName].title, value: commandData[commandName]})));
    //     setCommandList(dpcCommands.map((dpcCommand: object) => ({
    //         label: dpcCommand.title,
    //         value: dpcCommand,
    //         direction: dpcCommand.isUplink ? DIRECTION_UPLINK : DIRECTION_DOWNLINK
    //     })));
    //     setCommandsByDirection(Object.values(dpcCommands).map((dpcCommand: object) => ({
    //         label: dpcCommand.title,
    //         value: dpcCommand,
    //         direction: dpcCommand.isUplink ? DIRECTION_UPLINK : DIRECTION_DOWNLINK
    //     })));
    // };

    const handleBufferChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBuffer(event.target.value);
    };

    const handleClearBufferClick = () => {
        setBuffer('');
    };

    const handleCommandChange = (event: React.SyntheticEvent, newValue: object | null) => {
        setCommand(newValue);
        setParameters('');
    };

    const handleParametersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setParameters(event.target.value);
    };

    const handleDeletePreparedCommandClick = (index: number) => {
        const newPreparedCommands = [...preparedCommands];

        newPreparedCommands.splice(index, 1);

        setPreparedCommands(newPreparedCommands);
    };

    const handleAddToMessageClick = () => {
        const newPreparedCommands = [...preparedCommands];
        console.log(command.constructor.isUplink, 'command.constructor.isUplink');
        console.log(command, 'command');



        newPreparedCommands.push({
            command,
            parameters,
            id: uuidv4()
            // direction: command.constructor.isUplink ? DIRECTION_UPLINK : DIRECTION_DOWNLINK
        });

        setPreparedCommands(newPreparedCommands);
        setCommandList(preparedCommandList);
    };

    const handleClearCommandListClick = () => {
        setPreparedCommands([]);
        setCommandList(preparedCommandList);
    };



    // const handleDeviceChange = (event: React.SyntheticEvent, newValue: string | null) => {
    //     setDevice(newValue);
    // };

    const handleLogClick = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedLog(isExpanded ? panel : false);
    };

    const handleCommandLogClick = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedCommandLog(isExpanded ? panel : false);
    };

    const handleBuildClick = () => {
        // const command = new newValue.value({sequenceNumber: 78, time: 123456});
        // console.log(typeof parametersFromJSON, 'parametersFromJSON');
        // console.log(command, 'command');


        let data;
        let messageHex;
        let commandData;
        let buildError;

        // eval(`commandData = ${parameters}`);

        // const commandInstance = new command.value(commandData);
console.log(preparedCommands, 'preparedCommands');

        try {
            // messageHex = message.toHex([new command.value(commandData)]);
            // const dataCommands = preparedCommands.map(preparedCommand => new preparedCommand.command.value(preparedCommand.parameters));

            messageHex = message.toHex(preparedCommands.map(preparedCommand => {
                eval(`commandData = ${preparedCommand.parameters}`);

                return new preparedCommand.command.value(commandData);
            }));

            data = message.fromHex(messageHex);

            console.log(data, 'message data');
        } catch (error) {
            buildError = error;
        }

        console.log(messageHex, 'messageHex');
        console.log(buildError, 'buildError');


        // console.log(commandInstance.toBinary(), 'command.toBinary()');
        // console.log(commandInstance.toHex(), 'command.toHex()');

        const log: ILog = {
            // direction,
            buffer: messageHex,
            data: buildError ? null : data,
            date: new Date(),
            error: buildError,
            type: buildError ? LOG_TYPE_ERROR : LOG_TYPE_MESSAGE
        };

        setLogs(prevLogs => [log, ...prevLogs]);
    };

    const handleToggleParseButtonGroup = () => {
        setIsOpenParseButtonGroup(prevIsOpenParseButtonGroup => !prevIsOpenParseButtonGroup);
    };

    const handleParseButtonGroupMenuClose = (event: Event) => {
        if (
            anchorButtonGroupListRef.current &&
            anchorButtonGroupListRef.current.contains(event.target as HTMLElement)
        ) {
            return;
        }

        setIsOpenParseButtonGroup(false);
    };

    const handleMenuItemClick = (
        event: React.MouseEvent<HTMLLIElement, MouseEvent>,
        directionType: number
    ) => {
        setSelectedParseButtonIndex(directionType);
        setIsOpenParseButtonGroup(false);
    };

    const handleParseClick = () => {
        let data;
        let parseError;

        try {
            data = message.fromHex(buffer, Number(selectedParseButtonIndex));
            console.log(data, 'data');

        } catch (error: unknown) {
            parseError = error;
        }

        const log: ILog = {
            // direction,
            buffer,
            data: parseError ? null : data,
            date: new Date(),
            error: parseError,
            type: parseError ? LOG_TYPE_ERROR : LOG_TYPE_MESSAGE
        };

        setLogs(prevLogs => [log, ...prevLogs]);

        // return;

        // const dpcDirections = {
        //     [DIRECTION_UPLINK]: message.TYPE_UPLINK,
        //     [DIRECTION_DOWNLINK]: message.TYPE_DOWNLINK
        // };
        // console.log(buffer, 'buffer');

        // console.log(dpcDirections[direction as keyof typeof dpcDirections], 'dpcDirections[direction as keyof typeof dpcDirections]');

        // // const dpcCommands = dpcDirections[direction as keyof typeof dpcDirections];

        // let data;
        // let parseError;

        // try {
        //     data = message.fromHex(buffer, dpcDirections[direction as keyof typeof dpcDirections]);
        //     console.log(data, 'data');

        // } catch (error: unknown) {
        //     parseError = error;
        //     // if (error instanceof Error) {
        //     //     errorMessage = error.message;
        //     // }
        // }

        // const log: ILog = {
        //     direction,
        //     buffer,
        //     data: parseError ? null : data,
        //     date: new Date(),
        //     error: parseError,
        //     type: parseError ? LOG_TYPE_ERROR : LOG_TYPE_MESSAGE
        // };

        // setLogs(prevLogs => [log, ...prevLogs]);
    };

    const handleClearLogsClick = () => {
        setLogs([]);
        setExpandedLog(false);
    };

    return (
        <Box className="App">
            <Box sx={{display: 'flex', gap: 2, px: 2}}>
                <Box>
                    <Box sx={{display: 'flex', gap: 2, width: '500px', flexDirection: 'column', py: 2, pr: 2, position: 'sticky', top: 0, maxHeight: '100vh', overflowY: 'auto', minHeight: 0, '& > *': {minHeight: 0, flex: '0 0 auto'}}}>
                        {/* <FormControl variant="filled" size="small" sx={{mb: 2}}>
                            <InputLabel id="select-device-label">Direction</InputLabel>
                            <Select
                                labelId="select-device-label"
                                value={direction}
                                onChange={handleDirectionChange}
                            >
                                <MenuItem value={DIRECTION_UPLINK}>{DIRECTION_UPLINK}</MenuItem>
                                <MenuItem value={DIRECTION_DOWNLINK}>{DIRECTION_DOWNLINK}</MenuItem>
                            </Select>
                        </FormControl> */}

                        {/* <TextField label="Buffer" variant="filled" value={buffer} onChange={handleBufferChange} sx={{flexGrow: 1}} size="small" /> */}

                        <Typography variant="h5">Parse message</Typography>

                        <TextField
                            label="Buffer"
                            variant="filled"
                            onChange={handleBufferChange}
                            multiline
                            minRows={3}
                            maxRows={12}
                            value={buffer}
                            helperText="In a hex format"
                        />

                        {/* <FormControl variant="filled" size="small">
                            <InputLabel htmlFor="buffer">Buffer</InputLabel>
                            <FilledInput
                                id="buffer"
                                value={buffer}
                                onChange={handleBufferChange}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="clear buffer"
                                            onClick={handleClearBufferClick}
                                            edge="end"
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                }
                            />
                        </FormControl> */}

                        {/* <Button
                            disabled={!direction || !buffer}
                            variant="contained"
                            color="primary"
                            disableElevation
                            onClick={handleParseClick}
                            sx={{height: '48px', mb: 2}}
                        >
                            Parse
                        </Button> */}

                        {/* start parse button group */}

                        <ButtonGroup
                            disabled={!buffer}
                            disableElevation sx={{mb: 2}}
                            variant="contained"
                            ref={anchorButtonGroupListRef}
                            aria-label="parse button"
                        >
                            <Button fullWidth onClick={handleParseClick}>{parseButtonNameMap[selectedParseButtonIndex]}</Button>
                            <Button
                                sx={{height: '48px'}}
                                aria-controls={isOpenParseButtonGroup ? 'parse-button-group-menu' : undefined}
                                aria-expanded={isOpenParseButtonGroup ? 'true' : undefined}
                                aria-label="select parse strategy"
                                aria-haspopup="menu"
                                onClick={handleToggleParseButtonGroup}
                            >
                                <ArrowDropDownIcon />
                            </Button>
                        </ButtonGroup>
                        <Popper
                            sx={{
                                zIndex: 1000, minWidth: `${popperWidth}px}`
                            }}
                            open={isOpenParseButtonGroup}
                            anchorEl={anchorButtonGroupListRef.current}
                            role={undefined}
                            transition
                            disablePortal
                        >
                            {({TransitionProps, placement}) => (
                                <Grow
                                    {...TransitionProps}
                                    style={{
                                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom'
                                    }}
                                >
                                    <Paper>
                                        <ClickAwayListener onClickAway={handleParseButtonGroupMenuClose}>
                                            <MenuList id="parse-button-group-menu" autoFocusItem>
                                                {Object.entries(parseButtonNameMap).map(([directionType, buttonName], index) => (
                                                    <MenuItem
                                                        key={buttonName}
                                                        selected={index === selectedParseButtonIndex}
                                                        onClick={(event) => handleMenuItemClick(event, directionType)}
                                                    >
                                                        {buttonName}
                                                    </MenuItem>
                                                ))}
                                            </MenuList>
                                        </ClickAwayListener>
                                    </Paper>
                                </Grow>
                            )}
                        </Popper>

                        {/* end parse button group */}

                        <Typography variant="h5">Message creation</Typography>

                        <Autocomplete
                            options={commandList.sort((itemA, itemB) => itemA.direction.localeCompare(itemB.direction))}
                            getOptionDisabled={option => preparedCommands.length !== 0 && option.direction !== preparedCommands[0].command.direction}
                            groupBy={option => option.direction}
                            size="small"
                            value={command}
                            onChange={handleCommandChange}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Command"
                                    variant="filled"
                                    helperText="Commands in the message must be of the same direction"
                                />
                            )}
                        />

                        {command && (
                            <TextField
                                label="Parameters"
                                variant="filled"
                                onChange={handleParametersChange}
                                multiline
                                minRows={3}
                                maxRows={12}
                                value={parameters}
                                helperText="JSON/object with command parameters"
                            />
                        )}

                        <Box sx={{display: 'flex', gap: 2, alignItems: 'center', mb: 2, '& > *': {flexGrow: 1}}}>
                            <Button
                                disabled={!command || !parameters}
                                variant="contained"
                                color="primary"
                                disableElevation
                                onClick={handleAddToMessageClick}
                                sx={{height: '48px'}}
                            >
                            Add
                            </Button>

                            <Button
                                disabled={preparedCommands.length === 0}
                                variant="contained"
                                color="primary"
                                disableElevation
                                onClick={handleBuildClick}
                                sx={{height: '48px'}}
                            >
                            Build
                            </Button>

                            <Button
                                disabled={preparedCommands.length === 0}
                                variant="contained"
                                color="primary"
                                disableElevation
                                onClick={handleClearCommandListClick}
                                sx={{height: '48px'}}
                            >
                                Clear
                            </Button>
                        </Box>

                        {preparedCommands.length > 0 && (
                            <>
                                <Typography variant="h5">Message command list</Typography>

                                <List dense sx={{maxHeight: '200px', overflow: 'auto', p: 0}}>
                                    {preparedCommands.map((preparedCommand, index) => (
                                        <ListItem
                                            key={preparedCommand.id}
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="delete command from message" onClick={() => handleDeletePreparedCommandClick(index)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={`${preparedCommand.command.value.title} (${preparedCommand.command.direction})`}
                                                secondary={preparedCommand.parameters}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </>
                        )}
                    </Box>
                </Box>
                <Box sx={{flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2}}>
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        position: 'sticky',
                        top: 0,
                        p: 2,
                        zIndex: 10,
                        boxShadow: 1,
                        backgroundColor: 'background.default'
                    }}>
                        <Typography variant="h5">{`Logs${logs.length > 0 ? `: (${logs.length})` : ''}`}</Typography>
                        <Button
                            disabled={logs.length === 0}
                            variant="contained"
                            color="primary"
                            disableElevation
                            onClick={handleClearLogsClick}
                            sx={{height: '48px', ml: 'auto'}}
                        >
                            Clear
                        </Button>
                    </Box>

                    <Box sx={{mb: 2}}>
                        {logs.length > 0 && logs.map((log) => renderLog(log, expandedLog, expandedCommandLog, handleLogClick, handleCommandLogClick))}
                    </Box>

                    {/* <Box sx={{p: 2}}>
                        <Box sx={{display: 'flex', gap: 2}}>
                            <Box sx={{width: 300, display: 'flex', gap: 2, flexDirection: 'column'}}>
                                <Typography variant='h5' gutterBottom>Command creation</Typography>

                                <Autocomplete
                                    disabled={!direction}
                                    options={commandsByDirection}
                                    size="small"
                                    sx={{width: 300}}
                                    value={command}
                                    onChange={handleCommandChange}
                                    renderInput={(params) => <TextField {...params} label="Command" variant="filled" />}
                                />

                                {command && (
                                    <TextField
                                        label="Parameters"
                                        variant="filled"
                                        onChange={handleParametersFromJSONChange}
                                        multiline
                                        minRows={4}
                                        maxRows={12}
                                        value={parametersFromJSON}
                                        helperText="JSON with command parameters"
                                    />
                                )}

                                <Button disabled={!direction || !command || !parametersFromJSON} variant="contained" color="primary" disableElevation onClick={handleBuildClick} sx={{height: '48px'}}>Build</Button>
                            </Box>
                            <Box sx={{flexGrow: 1, display: 'flex', gap: 2, flexDirection: 'column'}}>
                                <Typography variant='h5' gutterBottom>Logs</Typography>
                                <Box>
                                    {logs.length > 0 && logs.map((log) => renderLog(log, expandedLog, handleLogClick))}
                                </Box>
                            </Box>
                        </Box>
                    </Box> */}
                </Box>
            </Box>

        </Box>
    );
};


export default App;

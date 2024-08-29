import React from "react";
import { TextField, Typography, FormControl, InputLabel, Select, MenuItem } from "@material-ui/core";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
    root: {
        margin: theme.spacing(2),
    },
    input: {
        margin: theme.spacing(1),
        width: '100%',
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
        width: '100%',
    },
    explanation: {
        marginTop: theme.spacing(2),
        color: theme.palette.text.secondary,
    },
});

class Settings extends React.Component {
    render() {
        const { classes, native, onChange } = this.props;

        return (
            <div className={classes.root}>
                <Typography variant="h6">Huawei Charger Configuration</Typography>
                
                <TextField
                    className={classes.input}
                    label="IP Address"
                    value={native.ipAddress || ''}
                    onChange={e => onChange('ipAddress', e.target.value)}
                    margin="normal"
                />
                
                <TextField
                    className={classes.input}
                    label="Port"
                    value={native.port || '502'}
                    onChange={e => onChange('port', e.target.value)}
                    margin="normal"
                />
                
                <TextField
                    className={classes.input}
                    label="Unit ID"
                    value={native.unitId || '1'}
                    onChange={e => onChange('unitId', e.target.value)}
                    margin="normal"
                />
                
                <FormControl className={classes.formControl}>
                    <InputLabel>Reconnect Interval</InputLabel>
                    <Select
                        value={native.reconnectInterval || 60000}
                        onChange={e => onChange('reconnectInterval', e.target.value)}
                    >
                        <MenuItem value={0}>Immediately</MenuItem>
                        <MenuItem value={300000}>5 minutes</MenuItem>
                        <MenuItem value={600000}>10 minutes</MenuItem>
                        <MenuItem value={900000}>15 minutes</MenuItem>
                        <MenuItem value={1800000}>30 minutes</MenuItem>
                        <MenuItem value={3600000}>60 minutes</MenuItem>
                    </Select>
                </FormControl>
                
                <Typography variant="body2" className={classes.explanation}>
                    The charger closes the connection every 65 seconds. You can choose how often the adapter should reconnect.
                </Typography>
            </div>
        );
    }
}

export default withStyles(styles)(Settings);

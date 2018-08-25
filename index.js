window.data = '';
window.csv = null;
window.csvDisplay = '';
const fileSelector = document.querySelector('#file-selector');
const fileError = document.querySelector('#file-error');

class CSV {
    constructor(str, hasHeader) {
        this.data = str;
        this.hasHeader = hasHeader | true;
        this.currentIndex = 0;
        this.dataStartIndex = undefined;
    }

    fields() {
        const self = this;
        self.currentIndex = 0;
        return new Promise((resolve, reject) => {
            try {
                const props = self._readRow();
                self.dataStartIndex = self.currentIndex;
                resolve (props);
            } catch (err) {
                reject(err);
            }
        });
    }

    get matrix() {
        const data = [];
        this.currentIndex = this.dataStartIndex;
        while (this.data[this.currentIndex] !== undefined) {
            const row = this._readRow();
            data.push(row);
        }
        return data;
    }

    toJSON() {
        const self = this;
        return new Promise((resolve, reject) => {
            if (self.data.length > 0) {
                if (self.hasHeader) {
                    self.fields().then(function (props) {
                        const objects = [];
                        const length = props.length;
                        while (self.data[self.currentIndex] !== undefined) {
                            const data = self._readRow();
                            const obj = {};
                            for (let i = 0; i < length; i++)
                                obj[props[i]] = data[i];
                            objects.push(obj);
                        }
                        resolve(objects);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
            } else {
                reject(Error('not header'));
            }
        });
    }

    toHTMLTable () {
        const self = this;
        return new Promise(function(resolve, reject) {
            self.fields().then(fields => {
                resolve(`
                <table class="table is-striped is-fullwidth">
                    <thead>
                        <tr>
                        ${fields.map(field => '<th>' + field + '</th>').join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${self.matrix.map(row => '<tr>' + row.map(value => '<td>' + value + '</td>').join('') + '</tr>').join('')}
                    </tbody>
                </table>`);
            });
        });
    }

    _readRow() {
        if (this.data.length > 0) {
            let start = this.currentIndex;
            const values = [];
            let newLine = false;
            while (newLine === false) {
                let data = '';
                let index = start;
                if (this.data[start] === '"') {
                    while (this.data[index] !== '"' && this.data[index] !== undefined) {
                        data += this.data[index++];
                    }
                    values.push(data);
                    if (/\r|\n/.test(this.data[++index]) || this.data[index] === undefined) {
                        if (this.data[index] === '\r') index++;
                        newLine = true;
                        this.currentIndex = index + 1;
                    } else {
                        start = index + 1;
                    }
                } else {
                    while (!/(\r|\n)|,/.test(this.data[index]) && this.data[index] !== undefined) {
                        if (this.data[index] === '\r') index++;
                        data += this.data[index++];
                    }
                    values.push(data);
                    if (/\r|\n/.test(this.data[index]) || this.data[index] === undefined) {
                        if (this.data[index] === '\r') index++;
                        newLine = true;
                        this.currentIndex = index + 1;
                    } else {
                        start = index + 1;
                    }
                }
            }
            return values;
        }
    }
}

function test(str) {
    const csv = new CSV(str);
    csv.toJSON().then(data => {
        document.getElementById('json').appendChild(renderjson(data));
    }).catch(err => console.error(err));
    // console.log(csv.data[csv.currentIndex]);
    // console.log(csv.currentIndex);
}

document.getElementById('file').addEventListener('change', function (ev) {
    const file = ev.target.files[0];
    if (/\.csv$/.test(file.name)) {
        /* file error message */
        fileSelector.classList.remove('is-danger');
        fileError.style.display = 'none';

        document.querySelector('.file-name').textContent = file.name;
    
        const reader = new FileReader();
        reader.onload = function () {
            window.data = reader.result;
            window.csv = new CSV(reader.result);
            document.querySelector('#raw').firstChild.textContent = window.csv.data;
            window.csv.toHTMLTable().then(html => {
                document.querySelector('#table').innerHTML = html;
            });
        };
    
        reader.readAsText(file);
    } else {
        fileSelector.classList.add('is-danger');
        fileError.style.display = '';    
    }
});

document.querySelectorAll('.tab-csv').forEach(e => {
    e.addEventListener('click', (ev) => {
        const tab = ev.currentTarget;
        if (window.csvDisplay !== tab.dataset.tab) {
            document.querySelector(`#${tab.dataset.tab}`).style.display = '';
            if (window.csvDisplay) {
                document.querySelector(`#${window.csvDisplay}`).style.display = 'none';
                document.querySelector(`.tab-csv[data-tab="${window.csvDisplay}"]`).classList.remove('is-active');
            }
            tab.classList.add('is-active');
            window.csvDisplay = tab.dataset.tab;
        }
    });
});
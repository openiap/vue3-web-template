<template>
  <div class="card">
    <div class="row">
      <div class="col">
        <select v-model="wiqid">
          <option disabled value="">Please select one</option>
          <option v-for="item in workitemqueues" :value="item._id" :key="item._id">
            {{ item.name }}
          </option>
        </select>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <input type="text" ref="searchfield" v-shortkey.focus="['ctrl', 'f']" v-model="searchValue"
          v-debounce:300ms="DoSearch" placeholder="Search term or json query">
      </div>
      <div class="col">
        <footer class="is-right">
          <button @click="Reload" class="button">Reload</button>
          <button @click="ToggleNew" class="button" :class="{ primary: shownew }">New</button>
          <button @click="ToggleSuccessful" class="button" :class="{ primary: showsuccessful }">Ok</button>
          <button @click="ToggleFailed" class="button" :class="{ primary: showfailed }">Failed</button>
          <button @click="ToggleProcessing" class="button" :class="{ primary: showprocessing }">Processing</button>
          <button v-shortkey.propagte="['insert']" @shortkey="Insert" @click="Insert" class="button primary"
            v-if="wiqid!=''">Insert</button>
          <button @click="Delete" v-shortkey.propagte="['del']" @shortkey="Delete" class="button error">Delete</button>
        </footer>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <button class="hidden" @click="Delete" :disabled='itemsSelected.length == 0'
          v-shortkey.propagte="['shift', 'del']" @shortkey="HardDelete">Hard Delete</button>
        <button class="hidden" v-shortkey.propagte="['arrowright']" @shortkey="NextPage">Next</button>
        <button class="hidden" v-shortkey.propagte="['arrowleft']" @shortkey="PreviusPage">Previus</button>
        <button class="hidden" v-shortkey.propagte="['arrowup']" @shortkey="PreviusCollection">Next</button>
        <button class="hidden" v-shortkey.propagte="['arrowdown']" @shortkey="NextCollection">Previus</button>
      </div>
    </div>
  </div>
  <div v-if="errormessage" class="row">
    <div class="col">
      <div class="card">
        <h1 class="text-error">{{errormessage}}</h1>
      </div>
    </div>
  </div>
  <div class="card">
    <EasyDataTable :headers="headers" :items="items" :loading="loading" :server-items-length="serverItemsLength"
      v-model:server-options="serverOptions" :rowsItems="rowsItems" alternating must-sort
      v-model:items-selected="itemsSelected" @click-row="RowClick">
  
      <template #item-_created="item">
        {{ _timeSince(item._created) }}
      </template>
      <template #item-_modified="item">
        {{ _timeSince(item._modified) }}
      </template>
      <template #item-timestamp="item">
        {{ _timeSince(item.timestamp) }}
      </template>
      <template #item-lastseen="item">
        {{ _timeSince(item.lastseen) }}
      </template>
      <template #item-lastrun="item">
        {{ _timeSince(item.lastrun) }}
      </template>
      <template #item-name="item">
        <router-link :to="{ name: 'WorkItemViewWithId', params: { id: item._id }}">{{item.name}}
        </router-link>
      </template>
      <template #item-operation="item">
        <div class="operation-wrapper">
          <img src="./images/edit.png" class="operation-icon" @click="editItem(item)" />
        </div>
      </template>
  
    </EasyDataTable>
    <small class="is-center">Click to select, left/right arrows to page/ up/down arror to change collection, del to
      delete </small>
  </div>
</template>

<script>
import { Util } from '../Util'
import { mapGetters } from 'vuex'
import { vue3Debounce } from 'vue-debounce'

export default {
  name: 'WorkitemsView',
  props: {
    propwiqid: { default: '' }
  },
  data() {
    return {
      errormessage: "",
      loading: false,
      searchValue: "",
      collectionname: "workitems",
      wiqid: "",
      lastSearchValue: "",
      serverItemsLength: 0,
      rowsItems: [10, 25, 50, 100],
      autoUpdateInterval: 15,
      serverOptions: {
        page: 1,
        rowsPerPage: 10,
        sortBy: '_created',
        sortType: 'desc',
      },
      workitemqueues: [],
      headers: [
      ],
      searchfields: ['name'],
      items: [
      ],
      itemsSelected: [],
      timer: null,
      showfailed: false,
      showsuccessful: false,
      shownew: false,
      showprocessing: false,
    }
  },
  created() {
    if (!Util.IsNullEmpty(this.propwiqid)) this.wiqid = this.propwiqid;
    this.GetData()
    this.LoadWorkitemQueues()
  },
  mounted() {
    this.FocusSearch();
  },
  computed: {
    ...mapGetters(['User', 'Signedin', 'Config', 'Client'])
  },
  directives: {
    debounce: vue3Debounce({ lock: true })
  },
  components: {
  },
  watch: {
    Signedin: function (val, oldVal) {
      if (val == true && oldVal != val) {
        this.GetData();
        this.LoadWorkitemQueues()
      }
    },
    wiqid: function (val, oldVal) {
      if (oldVal != val) {
        this.$router.replace({ path: `/Workitems/${val}` })
        this.itemsSelected = [];
        this.serverItemsLength = 0;
        this.serverOptions.page = 1;
        this.GetData();
      }
    },
    serverOptions: {
      handler: function (val, oldVal) {
        if (oldVal != val) {
          this.GetData();
        }
      },
      deep: true
    }
  },
  beforeMount() {
    this.addAutoUpdate();
  },
  beforeUnmount() {
    this.cancelAutoUpdate();
  },
  methods: {
    async Delete() {
      if (this.itemsSelected.length > 0) {
        let isExecuted = confirm("Are you sure want to delete the " + this.itemsSelected.length + " selected items?");
        if (!isExecuted) return;
        await this.Client.DeleteMany({ collectionname: this.collectionname, ids: this.itemsSelected.map(x => x._id) });
        this.itemsSelected = [];
        this.serverItemsLength = 0;
        this.GetData();
      }
    },
    editItem(item) {
      this.$router.push({ name: 'WorkItemViewWithId', params: { id: item._id } });
    },
    Insert() {
      this.$router.push({ name: 'NewWorkItemViewWithwiqid', params: { wiqid: this.wiqid } });
    },
    RowClick(item) {
      // this.itemsSelected = [...this.itemsSelected, item];
      var rowitem = this.items.find(x => x._id == item._id);
      rowitem.isSelected = !item.isSelected;
      item.isSelected = !item.isSelected;
      this.itemsSelected = this.items.filter(x => x.isSelected == true);
      // this.itemsSelected.push(item);
    },
    Reload() {
      this.GetData();
    },
    ToggleNew() {
      this.shownew = !this.shownew;
      this.serverItemsLength = 0;
      this.GetData();
    },
    ToggleSuccessful() {
      this.showsuccessful = !this.showsuccessful;
      this.serverItemsLength = 0;
      this.GetData();
    },
    ToggleFailed() {
      this.showfailed = !this.showfailed;
      this.serverItemsLength = 0;
      this.GetData();
    },
    ToggleProcessing() {
      this.showprocessing = !this.showprocessing;
      this.serverItemsLength = 0;
      this.GetData();
    },
    DoSearch() {
      if (this.lastSearchValue != this.searchValue) {
        this.serverItemsLength = 0;
        this.serverOptions.page = 1;
        this.GetData();
      }
    },
    PreviusPage() {
      if (this.serverOptions.page > 1) {
        this.serverOptions.page--;
        this.GetData();
      }
    },
    NextPage() {
      if (this.serverOptions.page < this.serverItemsLength / this.serverOptions.rowsPerPage) {
        this.serverOptions.page++;
        this.GetData();
      }
    },
    PreviusCollection() {
      var index = 0;
      for (var i = 0; i < this.workitemqueues.length; i++) {
        if (this.workitemqueues[i]._id == this.wiqid) index = i;
      }
      if (index > 0) {
        this.itemsSelected = [];
        this.serverItemsLength = 0;
        this.serverOptions.page = 1;
        this.wiqid = this.workitemqueues[index - 1]._id;
      }
    },
    NextCollection() {
      var index = 0;
      for (var i = 0; i < this.workitemqueues.length; i++) {
        if (this.workitemqueues[i]._id == this.wiqid) index = i;
      }
      if (index < this.workitemqueues.length - 1) {
        this.itemsSelected = [];
        this.serverItemsLength = 0;
        this.serverOptions.page = 1;
        this.wiqid = this.workitemqueues[index + 1]._id;
      }
    },
    FocusSearch() {
      this.$refs.searchfield.focus();
    },
    async LoadWorkitemQueues() {
      try {
        if (!this.Signedin) return;
        var result = [];
        result.push({ _id: "", name: "All" });
        var workitemqueues = await this.Client.Query({ query: { "_type": "workitemqueue" }, collectionname: "mq" });
        this.workitemqueues = result.concat(workitemqueues)
        // if (this.workitemqueues.length > 0 && this.ClientIsNullEmpty(this.wiqid)) this.wiqid = this.workitemqueues[0]._id;
      } catch (error) {
        this.errormessage = error;
      }
    },
    async GetData() {
      if (!this.Signedin) return;
      this.loading = true
      this.cancelAutoUpdate();
      try {
        var orderby = {};
        if (this.serverOptions.sortType == "asc") {
          orderby[this.serverOptions.sortBy] = 1;
        }
        if (this.serverOptions.sortType == "desc") {
          orderby[this.serverOptions.sortBy] = -1;
        }
        var query = { "_type": "workitem" };
        var exactquery = null;
        if (!Util.IsNullEmpty(this.wiqid)) query["wiqid"] = this.wiqid;
        if (!Util.IsNullEmpty(this.wiqid)) query["wiqid"] = this.wiqid;

        var states = [];
        if (this.shownew) states.push("new");
        if (this.showsuccessful) states.push("successful");
        if (this.showfailed) states.push("failed");
        if (this.showprocessing) states.push("processing");
        if (states.length > 0) query["state"] = { "$in": states };

        if (this.searchValue !== "" && this.searchValue != null) {
          if (this.searchValue.indexOf("{") == 0) {
            if (this.searchValue.lastIndexOf("}") == (this.searchValue.length - 1)) {
              try {
                this.errormessage = "";
                var _q = this.parseJson(this.searchValue, null, null);
                query = Object.assign(query, _q);
              } catch (error) {
                this.errormessage = error.message ? error.message : error;
              }
            }
          } else {
            let finalor = [];
            const finalexactor = [];
            for (let i = 0; i < this.searchfields.length; i++) {
              let newq = {};
              const newexactq = {};
              // exact match case sensitive
              // newq[this.searchfields[i]] = this.searchValue;
              // exact match case insensitive
              newexactq[this.searchfields[i]] = new RegExp(["^", this.searchValue, "$"].join(""), "i");
              // newexactq[this.searchfields[i]] = new RegExp(["^", this.searchValue].join(""), "i");

              // exact match string contains
              newq[this.searchfields[i]] = new RegExp([this.searchValue.substring(1)].join(""), "i");

              finalor.push(newq);
              finalexactor.push(newexactq);
            }
            var hastextindex = false;
            if (this.Config.collections_with_text_index.indexOf(this.collectionname) > -1) {
              hastextindex = true;
            }
            if (!this.searchValue.startsWith(".") && hastextindex) {
              finalor = [{ $text: { $search: this.searchValue.toLowerCase() } }]
            }
            if (Object.keys(query).length == 0) {
              query = { $or: finalor.concat() };
              exactquery = { $or: finalexactor.concat() };
            } else {
              query = { $and: [query, { $or: finalor.concat() }] };
              exactquery = { $and: [query, { $or: finalexactor.concat() }] };
            }
            if (!this.searchValue.startsWith(".") && hastextindex) {
              exactquery = { "_searchnames": this.searchValue.toLowerCase() };
            }

          }
        }

        if (Util.IsNullEmpty(this.wiqid)) {
          this.headers = [
            { text: "Name", value: "name" },
            { text: "State", value: "state", sortable: true },
            { text: "Queue", value: "wiq", sortable: false },
            { text: "By", value: "_createdby", sortable: false },
            { text: "Created", value: "_created", sortable: true },
            { text: "Due", value: "lastrun", sortable: false },
            { text: "Operation", value: "operation" },
          ]
        } else {
          this.headers = [
            { text: "Name", value: "name" },
            { text: "State", value: "state", sortable: true },
            { text: "By", value: "_createdby", sortable: false },
            { text: "Created", value: "_created", sortable: true },
            { text: "Due", value: "lastrun", sortable: false },
            { text: "Operation", value: "operation" },
          ]
        }


        if (this.collectionname != "cvr" && this.collectionname != "linkedin" && this.collectionname != "dbusage") {
          if (this.serverItemsLength == 0) {
            this.serverItemsLength = ((this.serverOptions.page - 1) * this.serverOptions.rowsPerPage) + this.serverOptions.rowsPerPage + 1;
            this.Client.Count({ query, collectionname: this.collectionname }).then(value => {
              this.serverItemsLength = value;
            });
          }
        } else {
          // fake more items
          this.serverItemsLength = ((this.serverOptions.page - 1) * this.serverOptions.rowsPerPage) + this.serverOptions.rowsPerPage + 1;
          if (this.items.length < this.serverOptions.rowsPerPage) {
            this.serverItemsLength = ((this.serverOptions.page - 1) * this.serverOptions.rowsPerPage) + this.items.length;
          }
          if (this.serverItemsLength < 1) this.serverItemsLength = 11;
        }
        if (this.serverItemsLength > 0) {
          if (exactquery != null && this.serverOptions.page == 1) {
            var arr = this.items = (await this.Client.Query({
              query: exactquery, collectionname: this.collectionname, top: 1
            }));
            if (arr.length > 0) {
              arr = arr.concat(await this.Client.Query({
                query, collectionname: this.collectionname, top: this.serverOptions.rowsPerPage - 1, orderby
              }));
            } else {
              arr = await this.Client.Query({
                query, collectionname: this.collectionname, top: this.serverOptions.rowsPerPage, orderby
              });

            }
            this.items = arr.filter((v, i, a) => a.findIndex(v2 => (v2._id === v._id)) === i)
          } else {
            this.items = await this.Client.Query({
              query, collectionname: this.collectionname, top: this.serverOptions.rowsPerPage,
              skip: (this.serverOptions.page - 1) * this.serverOptions.rowsPerPage,
              orderby,
              sort: this.serverOptions.sortBy + " " + this.serverOptions.sortType
            })
            if (this.serverOptions.page == 1 && this.items.length < this.serverOptions.rowsPerPage) {
              this.serverItemsLength = this.items.length;
            }
          }
        } else {
          this.items = [];
        }
        this.lastSearchValue = this.searchValue;
      } catch (error) {
        console.error(error);
      }
      finally {
        this.addAutoUpdate();
        this.loading = false;
      }
    },
    addAutoUpdate() {
      if (this.timer == null && this.autoUpdateInterval > 0) {
        this.timer = setInterval(this.doAutoUpdate, this.autoUpdateInterval * 1000);
      }
    },
    doAutoUpdate() {
      try {
        if (this.itemsSelected == null || this.itemsSelected.length == 0) {
          this.GetData();
        } else {
          this.addAutoUpdate();
        }
      } catch (error) {
      }
    },
    cancelAutoUpdate() {
      clearInterval(this.timer);
      this.timer = null;
    },
    parseJson(txt, reviver) {
      const context = 50;
      try {
        return JSON.parse(txt, reviver)
      } catch (e) {
        if (typeof txt !== "string") {
          const isEmptyArray = Array.isArray(txt) && txt.length === 0
          const errorMessage = "Cannot parse " +
            (isEmptyArray ? "an empty array" : String(txt))
          throw new TypeError(errorMessage)
        }
        const syntaxErr = e.message.match(/^Unexpected token.*position\s+(\d+)/i)
        const errIdx = syntaxErr
          ? +syntaxErr[1]
          : e.message.match(/^Unexpected end of JSON.*/i)
            ? txt.length - 1
            : null
        if (errIdx != null) {
          const start = errIdx <= context
            ? 0
            : errIdx - context
          const end = errIdx + context >= txt.length
            ? txt.length
            : errIdx + context
          e.message += ` while parsing near "${start === 0 ? "" : "..."
            }${txt.slice(start, end)}${end === txt.length ? "" : "..."
            }"`
        } else {
          e.message += ` while parsing "${txt.slice(0, context * 2)}"`
        }
        throw e
      }
    },
    _timeSince(timeStamp) {
      try {
        timeStamp = new Date(timeStamp);
      } catch (error) {
        return;
      }
      const now = new Date(),
        secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;
      if (secondsPast < 60) {
        return parseInt(secondsPast.toString()) + 's';
      }
      if (secondsPast < 3600) {
        return parseInt((secondsPast / 60).toString()) + 'm';
      }
      if (secondsPast <= 86400) {
        return parseInt((secondsPast / 3600).toString()) + 'h';
      }
      if (secondsPast > 86400) {
        let day = timeStamp.getDate();
        let month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
        let year = timeStamp.getFullYear() == now.getFullYear() ? "" : " " + timeStamp.getFullYear();
        return day + " " + month + year;
      }
    },
    _timeToo(timeStamp) {
      const now = new Date();
      let secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;
      var suffix = "";
      if (secondsPast > 0) suffix = " ago";
      if (secondsPast < 0) secondsPast *= -1

      if (secondsPast < 60) {
        return parseInt(secondsPast.toString()) + 's' + suffix;
      }
      if (secondsPast < 3600) {
        return parseInt((secondsPast / 60).toString()) + 'm' + suffix;
      }
      if (secondsPast <= 86400) {
        return parseInt((secondsPast / 3600).toString()) + 'h' + suffix;
      }
      if (secondsPast > 86400) {
        let day = timeStamp.getDate();
        let month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
        let year = timeStamp.getFullYear() == now.getFullYear() ? "" : " " + timeStamp.getFullYear();
        return day + " " + month + year;
      }
    },
  },
}
</script>

<style scoped>
body.dark {
  filter: saturate(3);
  --easy-table-header-font-color: rgba(255, 255, 255, 0.418);
}

body.dark .easy-checkbox {
  background: var(--easy-table-header-font-color)
}

body.dark .card a {
  color: var(--easy-table-header-font-color);
}

.operation-wrapper .operation-icon {
  width: 20px;
  cursor: pointer;
}

body.dark .operation-wrapper .operation-icon {
  filter: invert(100%);
}
</style>
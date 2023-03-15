<template>
  <div class="row">
    <div class="col">
      <button type="button" class="button primary col-3" v-on:click="Save"
      v-shortkey.propagte="['alt', 's']" @shortkey="Save">Save
      </button>
      <button @click="Insert" class="button hidden" v-shortkey.propagte="['insert']" @shortkey="Insert">Insert
        key</button>
      <button @click="SwapMode('json')" class="button">json</button>
      <button @click="SwapMode('form')" class="button">form</button>
      <ACL v-model="item" :showinvoke="collectionname=='users'||collectionname=='openrpa'||collectionname=='mq'" ></ACL>
    </div>
  </div>
  <section v-if="mode=='form'">
    <div class="row">
      <div class="col">
        <h1>{{item.name}}</h1>
      </div>
    </div>
    <div v-if="errormessage" class="row">
      <div class="col">
        <div class="card">
          <h1 class="text-error">{{errormessage}}</h1>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <img src="./images/delete.png" class="operation-icon disabled" />
        name
      </div>
      <div class="col">
        <editableTextField v-model="item.name" />
      </div>
    </div>
    <div class="row">
      <div class="col">
        <img src="./images/delete.png" class="operation-icon disabled" />
        type
      </div>
      <div class="col">
        <editableTextField v-model="item._type" />
      </div>
    </div>
    <div class="row">
      <div class="col">
    
        <div v-for="(service, i) in item" :key="i">
          <div v-if="!i.startsWith('_') && i != 'name'" class="row">
            <editableTextField v-if="editingname == i" class="col" v-model="newname" @escaped="CancelEditname"
              @accepted="AcceptEditname" :emitevents="emitevents" Editing=true>
            </editableTextField>
            <div v-if="editingname != i && i != '_type' && i != 'name'" class="col"><img src="./images/delete.png"
                class="operation-icon" @click="delete item[i]" /><span @click="EditName(i)">{{i}}</span></div>
            <div v-if="editingname != i && (i == '_type' || i == 'name')" class="col">{{i}}</div>
            <div class="col">
              <editableTextField v-model="item[i]"></editableTextField>
            </div>
    
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <small>click field to edit, press insert to add field, press esc to cancel</small>
      </div>
    </div>
    </section>
    <!-- <textarea-autosize v-if="mode=='json'" ref="myTextarea" v-model="json" :min-height="30" :max-height="350" /> -->
    <!-- <ResizeByMixin v-if="mode=='json'" v-model="json"></ResizeByMixin> -->
    <!-- <editableTextField Editing="true" v-model="json" v-if="mode=='json'"></editableTextField> -->
    <textarea v-if="mode=='json'" ref="myTextarea" v-model="json" rows="20" :min-height="30" :max-height="350" />
        <div class="row">
          <div class="col">
        <button type="button" class="button primary col-3" v-on:click="Save"
        v-shortkey.propagte="['ctrl', 's']" @shortkey="Save">Save
        </button>
        <button @click="Insert" class="button hidden" v-shortkey.propagte="['insert']" @shortkey="Insert">Insert
          key</button>
          <button @click="SwapMode('json')" class="button">json</button>
          <button @click="SwapMode('form')" class="button">form</button>
          <button @click="SwapMode('acl')" class="button">acl</button>
    </div>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import editableTextField from '@/components/editableTextField.vue';
import ResizeByMixin from '@/components/ResizeByMixin.vue';
import TypeAheadQuery from '@/components/TypeAheadQuery.vue';
import ACL from '@/components/ACL.vue';
import { Util } from '@/Util';
import { Base } from "./../Base"

export default {
  name: 'EntityView',
  emits: ['update:item'],
  components: {
    editableTextField,
    ResizeByMixin,
    TypeAheadQuery,
    ACL
  },
  data() {
    return {
      json: "",
      item: new Base(),
      errormessage: '',
      editingname: '',
      emitevents: false,
      newname: 'newname',
      mode: 'form',
      user: new Base()
    }
  },
  props: ['collectionname', 'id'],
  computed: {
    ...mapGetters(['Signedin', 'Client']),
  },
  created() {
    this.GetData()
  },
  watch: {
    Signedin: function (val, oldVal) {
      if (val == true && oldVal != val) {
        this.GetData();
      }
    },
    id: function (val, oldVal) {
      if (!Util.IsNullEmpty(val) == true && oldVal != val) {
        this.GetData();
      }
    },
  },
  methods: {
    SwapMode(newmode) {
      this.mode = newmode;
      if (this.mode == 'json') {
        this.json = JSON.stringify(this.item, null, 2);
      } else {
        this.item = JSON.parse(this.json)
      }
    },
    EditName(i) {
      this.editingname = i;
      this.newname = i;
      setTimeout(() => { this.emitevents = true }, 200)
    },
    CancelEditname() {
      this.emitevents = false;
      this.editingname = '';
      this.newname = "newname"
    },
    AcceptEditname() {
      this.emitevents = false;
      if (this.newname != this.editingname) {
        this.item[this.newname] = this.item[this.editingname];
        delete this.item[this.editingname];
      }
      this.editingname = '';
      this.newname = "newname"
    },
    Insert() {
      this.item['newfield'] = '';
    },
    async GetData() {
      this.item.name = "new item";
      if (this.Signedin == true && !Util.IsNullEmpty(this.id)) {
        var results = await this.Client.Query({ collectionname: this.collectionname, query: { _id: this.id }, top: 1 });
        if (results.length > 0) {
          this.item = results[0];
          this.json = JSON.stringify(this.item, null, 2);
        }
      }
    },
    async Save(e) {
      if(e != null) {
        if(e.preventDefault) e.preventDefault();
        if(e.stopPropagation) e.stopPropagation();
        e.returnValue = 'Really want to quit the game?';
      }
      var item = { ...this.item };
      if (this.mode == "json") var item = JSON.parse(this.json);
      try {
        if (!Util.IsNullEmpty(this.id)) {
          await this.Client.UpdateOne({ collectionname: this.collectionname, item });
        } else {
          await this.Client.InsertOne({ collectionname: this.collectionname, item });
        }
        if(e != null) {
          setTimeout(() => { 
            this.$router.push({ name: 'EntitiesCollection', params: { propcollectionname: this.collectionname } });
          }, 200)
        } else {
          this.$router.push({ name: 'EntitiesCollection', params: { propcollectionname: this.collectionname } });
        }        

      } catch (error) {
        this.errormessage = error
      }
      return false;
    }
  }
}
</script>

<style scoped>
.operation-icon {
  margin-bottom: -5px;
  width: 20px;
  height: 20px;
  cursor: pointer;
}
.operation-icon.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

body.dark .operation-icon {
  filter: invert(100%);
}

.row {
  display: flex;
}

.col {
  flex: 1;
  border: 1px #ccc;
  align-self: flex-end;
}
</style>

var spa = spa || {};

///
/// Standard Enumerations
///
spa.entityStates = {
    /// <summary>
    /// The States that a Self-Tracking Entity would Need
    /// <summary>
    unchanged: "unchanged", // Persisted, not changed
    added: "added", // Added, not saved
    removed: "removed", // Removed, not saved
    modified: "modified" // Changed, not saved
};
spa.filterTypes = {
    /// <summary>
    /// The Filters used in odata query strings
    /// <summary>
    Equal: "eq",
    NotEqual: "ne",
    GreaterThan: "gt",
    GreaterThanOrEqual: "ge",
    LessThan: "lt",
    LessThanOrEqual: "le",
    And: "and",
    Or: "or",
    Not: "not"
};


///
/// DataAdapter
///

spa.dataAdapter = function (controllerName) {
    /// <summary>
    /// Creates a DataAdapter to talk to a Web API Controller
    /// </summary>
    /// <param name="controllerName" type="String">
    /// Required: Name of the Controller
    /// </param>
    /// <return>
    /// DataAdapter
    /// </return>
    this._controllerUrl = "/api/" + controllerName;
};

spa.dataAdapter.prototype = {
    LoadOne: function (id, callBack) {
        /// <summary>
        /// Loads a single item (GET)
        /// </summary>
        /// <param name="id" type="var">
        /// Required: id of the entity
        /// </param>
        /// <param name="callBack" type="function (data)">
        /// Required: callback with the data
        /// </param>
        $.ajax({
            type: "POST",
            contentType: "application/json",
            dataType: "text json",
            url: this._controllerUrl + "/" + id,
            type: "GET",
            success: callBack,
        });
    },
    PostItem: function (data, callBack) {
        /// <summary>
        /// Adds a single item (POST)
        /// </summary>
        /// <param name="data" type="JSON">
        /// Required: data to post
        /// </param>
        /// <param name="callBack" type="function (data)">
        /// Required: callback with the data
        /// </param>
        $.ajax({
            type: "POST",
            contentType: "application/json",
            dataType: "text json",
            url: this._controllerUrl,
            data: data,
            success: callBack,
        });
    },
    PutItem: function (id, data, callBack) {
        /// <summary>
        /// Updates a single item (PUT)
        /// </summary>
        /// <param name="id" type="var">
        /// Required: id of the entity
        /// </param>
        /// <param name="data" type="JSON">
        /// Required: data to put
        /// </param>
        /// <param name="callBack" type="function (data)">
        /// Required: callback with the data
        /// </param>
        $.ajax({
            type: "PUT",
            contentType: "application/json",
            dataType: "text json",
            url: this._controllerUrl + "/" + id,
            data: data,
            success: callBack
        });
    },
    DeleteItem: function (id, callBack) {
        /// <summary>
        /// Deletes a single item (DELETE)
        /// </summary>
        /// <param name="id" type="var">
        /// Required: id of the entity
        /// </param>
        /// <param name="callBack" type="function ()">
        /// Required: callback when done
        /// </param>
        $.ajax({
            type: "DELETE",
            contentType: "application/json",
            dataType: "text json",
            url: this._controllerUrl + "/" + id,
            statusCode: {
                200: callBack.call(this),
            }
        });
    },
    QueryAll: function (callBack, query) {
        /// <summary>
        /// Gets multiple items (GET)
        /// </summary>
        /// <param name="callBack" type="function (data)">
        /// Required: callback with entities
        /// </param>
        /// <param name="query" type="String">
        /// Optional: odata QueryString
        /// </param>
        var url = this._controllerUrl;
        if (query) {
            url = url + "?" + query;
        }
        $.ajax({
            type: "GET",
            contentType: "application/json",
            dataType: "text json",
            url: url,
            success: callBack,
        });
    }
};

///
/// DataContext
///
spa.dataContext = function (bufferDefault) {
    /// <summary>
    /// Creates a DataContext to contain DataSets
    /// </summary>
    /// <param name="bufferDefault" type="Boolean">
    /// Optional: buffer changes for new DataSets (default: false)
    /// </param>
    /// <return>
    /// new DataContext
    /// </return>
    this.buffer = bufferDefault || false;
};

spa.dataContext.prototype = {
    AddSet: function (controllerName, keyPropertyName, buffer) {
        /// <summary>
        /// Add a New DataSet to the DataContext
        /// </summary>
        /// <param name="controllerName" type="String">
        /// Required: Name of the Web API Controller
        /// </param>
        /// <param name="keyPropertyName" type="String">
        /// Required: Key field (only 1 supported) for the entities
        /// </param>
        /// <param name="buffer" type="Boolean">
        /// Optional: buffer changes for new DataSets (default: contextDefault)
        /// </param>
        /// <return>
        /// new DataSet
        /// </return>
        if (!this[controllerName]) {
            this[controllerName] = new spa.dataSet(controllerName, keyPropertyName, this.buffer, this);
        }
        return this[controllerName];
    },
    FindEntity: function (controllerName, Key) {
        /// <summary>
        /// Find an Entity somewhere in the DataContext
        /// </summary>
        /// <param name="controllerName" type="String">
        /// Required: Name of the DataSet / Controller
        /// </param>
        /// <param name="key" type="var">
        /// Required: Key value of the entity
        /// </param>
        /// <return>
        /// dataEntity (if in collection)
        /// </return>
        return this[controllerName].FindByKey(key);
    }
};

///
/// DataSet
///

spa.dataSet = function (setName, keyPropertyName, buffer, dataContext) {
    this.DataSetName = setName;
    this.DataAdapter = new spa.dataAdapter(setName);
    this.Key = keyPropertyName;
    this.Buffer = buffer || false;
    this.Entities = {};     // Use Key for Indexer
    this.NewItems = [];     // No Valid Key, just Maintain list of items to be added
    this.PartOf = dataContext;
};

spa.dataSet.prototype = {
    CreateView: function (query) {
        /// <summary>
        /// Create a View from this DataSet
        /// </summary>
        /// <param name="controllerName" type="String">
        /// Optional: Query to use with the View
        /// </param>
        /// <return>
        /// new dataView
        /// </return>
        return new spa.dataView(this, query);
    },
    Read: function (obsArray, query, refresh) {
        /// <summary>
        /// Loads Data Into the obsArray
        /// </summary>
        /// <param name="obsArray" type="ko.observableArray">
        /// Required: Array to Load dataEntities into
        /// </param>
        /// <param name="query" type="spa.odataQuery">
        /// Required: Query to Get Entities
        /// </param>
        /// <param name="refresh" type="Boolean">
        /// Optional: Should the Query refresh entities (false to preseve changes)
        /// </param>
        var self = this;
        this.DataAdapter.QueryAll(function (data) {
            obsArray.remove(function (entity) {
                return (entity.EntityState() != spa.entityStates.added);
            });
            $.map(data, function (item) {
                var existing = self.FindByKey(item);
                if (existing) {
                    if (refresh) {
                        existing.Update(item);
                    }
                    if (existing.EntityState() != spa.entityStates.removed) {
                        obsArray.push(existing);
                    }
                }
                else {
                    var newEntity = new spa.dataEntity(item);
                    self.Attach(newEntity);
                    obsArray.push(newEntity);
                }
            });
            // TODO: Add Sorting for Additional Ordering
            if (query.orderby().length > 0) {
                obsArray.sort(function (left, right) {
                    var ordering = query.orderby()[0];
                    var fldName = ko.utils.unwrapObservable(ordering.field);
                    var l = ko.utils.unwrapObservable(left.Entity[fldName]);
                    var r = ko.utils.unwrapObservable(right.Entity[fldName]);
                    if (ordering.ascending) {
                        return l == r ? 0 : (l < r ? -1 : 1);
                    }
                    else {
                        return l == r ? 0 : (l > r ? -1 : 1);
                    }
                });
            }
        }, query.ToQueryString());
    },
    Refresh: function (entity) {
        /// <summary>
        /// Refreshes an Entity
        /// </summary>
        /// <param name="entity" type="spa.dataEntity">
        /// Required: Item to Refresh from the Server
        /// </param>
        var keyToUpdate = dataEntity.Entity[this.Key]();
        this.DataAdapter.LoadOne(keyToUpdate, function (data) {
            entity.Update(data);
        });
    },
    Create: function (entity) {
        /// <summary>
        /// Submits an Entity to the Server
        /// </summary>
        /// <param name="entity" type="spa.dataEntity">
        /// Required: Item to save (via POST)
        /// </param>
        if (entity.IsSubmitting() == false) {
            var set = this;
            entity.IsSubmitting(true);
            this.DataAdapter.PostItem(entity.ToJSON(), function (data) {
                entity.IsSubmitting(false);
                entity.Update(data);
                set.NewItems.splice(set.NewItems.indexOf(entity), 1);
                set.Attach(entity);
            });
        }
    },
    Update: function (entity) {
        /// <summary>
        /// Updates an Item to the Server
        /// </summary>
        /// <param name="entity" type="spa.dataEntity">
        /// Required: Item to Update (via PUT)
        /// </param>
        if (entity.IsSubmitting() == false) {
            var key = this.GetKey(entity.Entity);
            entity.IsSubmitting(true);
            this.DataAdapter.PutItem(key, entity.ToJSON(), function (data) {
                entity.IsSubmitting(false);
                entity.Merge(data);
            });
        }
    },
    Delete: function (entity) {
        /// <summary>
        /// Deletes an Item from the Server
        /// </summary>
        /// <param name="entity" type="spa.dataEntity">
        /// Required: Item to Delete (via DELETE)
        /// </param>
        if (entity.IsSubmitting() == false) {
            var key = this.GetKey(entity.Entity);
            var set = this;
            entity.IsSubmitting(true);
            this.DataAdapter.DeleteItem(key, function () {
                entity.IsSubmitting(false);
                set.Detach(entity);
            });
        }
    },
    Attach: function (entity) {
        /// <summary>
        /// Attaches an item to the DataSet
        /// </summary>
        /// <param name="entity" type="spa.dataEntity">
        /// Required: Item to Attach (commits immediately if Buffer is false)
        /// </param>
        var key = this.GetKey(entity.Entity);
        if (!this.Entities[key]) {
            if (!key) {
                this.NewItems.push(entity);
                if (this.Buffer === false) {
                    this.Create(entity);
                }
            }
            else {
                this.Entities[key] = entity;
                if (this.Buffer === false) {
                    // TODO: Subscribe to has changes
                    entity.EntityState.subscribe(function (newState) {
                        if (newState == spa.entityStates.modified) {
                            this.Update(entity);
                        }
                        else if (newState == spa.entityStates.removed) {
                            this.Delete(entity);
                        }
                    }, this);
                }
            }
        }
    },
    Detach: function (entity) {
        /// <summary>
        /// Removes an item from being tracked by the DataSet
        /// </summary>
        /// <param name="entity" type="spa.dataEntity">
        /// Required: Item to stop tracking (and delete from memory)
        /// </param>
        var keyToFind = entity.Entity[this.Key]();
        if (this.Entities[keyToFind]) {
            delete this.Entities[keyToFind];
        }
    },
    GetKey: function (entity) {
        /// <summary>
        /// Gets the Key associated with an entity
        /// </summary>
        /// <param name="entity" type="spa.dataEntity">
        /// Required: Entity to find the Key for
        /// </param>
        /// <return>
        /// The Key for the Entity
        /// </return>
        return ko.utils.unwrapObservable(entity[this.Key]);
    },
    FindByKey: function (entity) {
        /// <summary>
        /// Finds a Matching Entity in the set (by Key)
        /// </summary>
        /// <param name="entity" type="spa.dataEntity or JSON">
        /// Required: Entity to find the Key for
        /// </param>
        /// <return>
        /// The Entity with matching key that is attached, or null
        /// </return>
        var keyToFind = ko.utils.unwrapObservable(entity[this.Key]);
        if (this.Entities[keyToFind]) {
            return this.Entities[keyToFind];
        }
        else {
            return null;
        }
    },
    GetChanges: function () {
        /// <summary>
        /// Gets all entities which have pending updates (changes)
        /// </summary>
        /// <return>
        /// Array of dataEntities
        /// </return>
        var c = [];
        for (key in this.Entities) {
            if (this.Entities[key].HasChanges()) {
                c.push(this.Entities[key]);
            }
        }
        return c;
    },
    GetRemoved: function () {
        /// <summary>
        /// Gets all entities which have pending deletes (removed)
        /// </summary>
        /// <return>
        /// Array of dataEntities
        /// </return>
        var c = [];
        for (key in this.Entities) {
            if (this.Entities[key].EntityState() === spa.entityStates.removed) {
                c.push(this.Entities[key]);
            }
        }
        return c;
    },
    SaveAll: function () {
        /// <summary>
        /// Commits all Pending Operations (PUT, DELETE, POST)
        /// </summary>
        for (var i = 0, l = this.NewItems.length; i < l; i++) {
            this.Create(this.NewItems[i]);
        }
        var changes = this.GetChanges();
        for (var i = 0, l = changes.length; i < l; i++) {
            this.Update(changes[i]);
        }
        var deletes = this.GetRemoved();
        for (var i = 0, l = deletes.length; i < l; i++) {
            this.Delete(deletes[i]);
        }
    }
};

///
/// DataView
///

spa.dataView = function (dataSet, query) {
    /// <summary>
    /// Creates a DataView to contain DataSets
    /// </summary>
    /// <param name="dataSet" type="spa.dataSet">
    /// Required: DataSet which tracks the entities
    /// </param>
    /// <param name="query" type="spa.odataQuery">
    /// Optional: Query for new dataView (creates blank one if omitted)
    /// </param>
    /// <return>
    /// new DataView
    /// </return>
    this.DataSet = dataSet;
    this.Query = query || new spa.odataQuery();
    this.ViewItems = ko.observableArray();
};

spa.dataView.prototype = {
    AddItem: function (newItem) {
        /// <summary>
        /// Adds a New Item to the View (auto-commit is set in Dataset)
        /// </summary>
        /// <param name="newItem" type="spa.dataEntity">
        /// Required: The New Item
        /// </param>
        newItem.EntityState(spa.entityStates.added);
        this.DataSet.Attach(newItem);
        this.ViewItems.push(newItem);
    },
    DeleteItem: function (toDelete) {
        /// <summary>
        /// Deletes an Item from the View (auto-commit is set in Dataset)
        /// </summary>
        /// <param name="toDelete" type="spa.dataEntity">
        /// Required: The Item to Delete
        /// </param>
        toDelete.EntityState(spa.entityStates.removed);
        this.ViewItems.remove(toDelete);
    },
    SaveAll: function () {
        /// <summary>
        /// Commits all Changes (if based on DataSet with Buffer = true)
        /// </summary>
        this.DataSet.SaveAll();
    },
    Refresh: function (overwrite) {
        /// <summary>
        /// Update the DataView by re-submitting the Query (
        /// </summary>
        /// <param name="overwrite" type="Boolean">
        /// Optional: Should the Query refresh entities (false to preseve changes)
        /// </param>
        this.DataSet.Read(this.ViewItems, this.Query, overwrite);
    },
};


spa.ordering = function (field, ascending) {
    this.field = ko.observable(field);
    this.ascending = ascending || true;
}

spa.ordering.prototype = {
    ToOrderString: function () {
        /// <summary>
        /// Creates a String acceptable for odata Query String $orderby
        /// </summary>
        if (this.ascending) {
            return ko.utils.unwrapObservable(this.field) + " asc";
        }
        else {
            return ko.utils.unwrapObservable(this.field) + " desc";
        }
    }
};

spa.odataQuery = function () {
    this.pageNum = ko.observable(0);
    this.pageSize = ko.observable(0);
    this.orderby = ko.observableArray();
    this.filter = undefined;
};

spa.odataQuery.prototype = {
    ToQueryString: function () {
        /// <summary>
        /// Creates an odata Query string (includes $filter, $skip, $top, $orderby)
        /// </summary>
        if ((this.pageNum() != 0 || this.pageSize() != 0) && this.orderby.length > 0) {
            throw "You must specify atleast 1 order function when using paging";
        }
        if (this.pageNum() != 0 && this.pageSize() == 0) {
            throw "You cannot specify a page number without a page size";
        }
        var qstring = [];
        if (this.filter) {
            qstring.push("$filter=" + this.filter);
        }
        if (this.pageNum()) {
            qstring.push("$skip=" + (this.pageSize() * this.pageNum()));
        }
        if (this.pageSize()) {
            qstring.push("$top=" + this.pageSize());
        }
        var orders = [];
        for (var ord in this.orderby()) {
            orders.push(this.orderby()[ord].ToOrderString());
        }
        if (orders.length) {
            qstring.push("$orderby=" + orders.join(", "));
        }
        return qstring.join("&");
    }
};

///
/// DataEntity
///


spa.dataEntity = function (data, initialState) {
    var self = this;
    self._origData = data;
    self._persistData = null;
    self.Entity = ko.mapping.fromJS(data);
    self.EntityState = ko.observable(initialState || spa.entityStates.unchanged);
    self.IsSubmitting = ko.observable(false);
    self.HasChanges = ko.computed(function () {
        for (var prop in self._origData) {
            if (self._origData[prop] != ko.utils.unwrapObservable(self.Entity[prop])) {
                if (self.EntityState() == spa.entityStates.unchanged) {
                    self.EntityState(spa.entityStates.modified);
                }
                return true;
            }
        }
        if (self.EntityState() == spa.entityStates.modified) {
            self.EntityState(spa.entityStates.unchanged);
        }
        return false;
    });
};

spa.dataEntity.prototype = {
    Update: function (data) {
        /// <summary>
        /// Updates the Entity (overwrites any pending changes)
        /// </summary>
        /// <param name="data" type="JSON">
        /// Required: New Data for the entity
        /// </param>
        this._origData = data;
        for (prop in data) {
            if (data[prop] != ko.utils.unwrapObservable(this.Entity[prop])) {
                this.Entity[prop](data[prop]);
            }
        }
        this.EntityState(spa.entityStates.unchanged);
    },
    Merge: function (data) {
        /// <summary>
        /// Updates the Entity (preserves any pending changes since the last ToJSON call)
        /// </summary>
        /// <param name="data" type="JSON">
        /// Required: New Data for the entity
        /// </param>

        // Get List of Modifications since the data
        var newMods = false;
        var lastSubmit = JSON.parse(this._persistData) || this._origData;
        for (prop in data) {
            if (lastSubmit[prop] != data[prop]) {
                newMods = true;
                break;
            }
        }
        // Only Update Properties which are not currently modified
        this._origData = data;
        for (prop in data) {
            if (data[prop] != ko.utils.unwrapObservable(this.Entity[prop])) {
                this.Entity[prop](data[prop]);
            }
        }
        if (newMods == false) {
            this.EntityState(spa.entityStates.unchanged);
        }
        else {
            this.EntityState(spa.entityStates.modified);
        }
    },
    ToJSON: function () {
        /// <summary>
        /// Gets JSON value of the Entity (sets change tracking marker)
        /// </summary>
        /// <return>
        /// JSON String
        /// </return>
        this._persistData = ko.mapping.toJSON(this.Entity);
        return this._persistData;
    },
};
